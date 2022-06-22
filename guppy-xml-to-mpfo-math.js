/*
 * TODO
 * - [done] support units and prefixes
 * - [done] support all relevant content dictionaries
 * - [done] support number types (integer, real, rational)
 * - [done] support cases environment (see guppy-js docs)
 * - [done] support prog1 content dictionary
 * - [done] support definition of custom symbols (e.g. "Umax")
 * - [done] support arith1/product and arith1/sum
 * - add help to website (e.g., definition of piecewise functions)
 * - support customizable namespace
 * - support mathematical constants (Pi, Euler's number, ...)
 * - support exp function
 * - support n-ary arith1/plus: instead of 1+2+3 => (+, (+, 1, 2), 3); make (+, 1, 2, 3)
 * - support n-ary arith1/times: instead of 1*2*3 => (*, (*, 1, 2), 3); make (*, 1, 2, 3)
 * - support n-ary logic1/*
 * - support quantifiers "exists" and "forall"
 * - support number types (2+3i -> complex; not necessary: double (-0,+inf,-inf, NaN, -1E4); hexdouble)
 * - support import of MPFo math code
 * - support for structure sharing (id --> <mml:share href="#id"/>): automatic detection?; separate definition of variables that can be used in the main function?
 */

var guppy_xml_to_mpfo_math = function(engine, doc) {
    var rxNumber = /^<Double>([^<]+)<\/Double>$/;
    var rxInteger = /^<Integer>([+-]?\d+)<\/Integer>$/;
    var rxVariable = /^<Identifier name="([^"]+)"\/>$/;

    var wrapXML = function(tag, content) {
        return '<' + tag + '>' + content + '</' + tag + '>';
    };
    var baseFunctionRef = function(fn) {
        return '<BaseFunctionRef ref="mpfo://mpfo.org/std-functions/v1#' + fn + '"\/>';
    }
    var apply = function(fn, args) {
        return wrapXML('Apply', baseFunctionRef(fn) + args.join(""));
    };
    var bind = function(fn, variables, content) {
        return apply("bind", [variables, content]);
    };

    var functions = {};

    var simple_commands = {
        "arith1": {
            "abs": "absolutevalue",
            "divide": "fraction",
            "plus": "+",
            "power": "exponential",
            "times": "*",
        },
        "directives1": {
            "evaluate": "eval"
        },
        "integer1": {
            "factorial": "factorial"
        },
        "logic1": {
            "and": "and",
            "nand": "nand",
            "nor": "nor",
            "not": "not",
            "or": "or",
            "xnor": "xnor",
            "xor": "xor"
        },
        "norm1": {
            "Euclidean_norm": "norm"
        },
        "nums1": {
        },
        "prog1": {
            "assignment": "assignment",
            "if": "if",
            "for": "for",
            "function_block": "functionBlock",
            "function_call": "functionCall",
            "function_definition": "functionDefinition",
            "procedure_block": "procedureBlock",
            "procedure_call": "procedureCall",
            "procedure_definition": "procedureDefinition",
            "while": "while"
        },
        "relation1": {
            "eq": "=",
            "lt": "<",
            "gt": ">",
            "neq": "!=",
            "leq": "<=",
            "geq": ">="
        },
        "rounding1": {
            "ceiling": "ceil",
            "floor": "floor"
            //"round"
            //"trunc"
        },
        "transc1": {
            "arccos": "arccos",
            //"arccosh"
            //"arccot"
            //"arccoth"
            //"arccsc"
            //"arccsch"
            //"arcsec"
            //"arcsech"
            "arcsin": "arcsin",
            //"arcsinh"
            "arctan": "arctan",
            //"arctanh"
            "cos": "cos",
            "cosh": "cosh",
            "cot": "cot",
            //"coth"
            "csc": "csc",
            //"csch"
            //"exp"
            "ln": "ln",
            "log": "log",
            "sec": "sec",
            //"sech"
            "sin": "sin",
            "sinh": "sinh",
            "tan": "tan",
            "tanh": "tanh"
        },
    };

    // Iterate entries in simple_commands variable and create functions that generate
    // corresponding MPFo math code.
    for (var cd_name in simple_commands) {
        var cd = simple_commands[cd_name];
        for (var op in cd) {
            functions[cd[op]] = function(op) {
                return function(args) {
                    return apply(op, args);
                };
            }(op);
        }
    }

    // commands that have a list as single argument
    var list_commands = {
        "linalg2": {
            "vector": "vector"
        },
        "prog1": {
            "block": "block",
            "call_arguments": "callArguments",
            "def_arguments": "defArguments",
            "global_var": "globalVar",
            "local_var": "localVar",
            "return": "return"
        }
    }

    // Iterate entries in list_commands variable and create functions that generate
    // corresponding MPFo math code.
    for (var cd_name in list_commands) {
        var cd = list_commands[cd_name];
        for (var op in cd) {
            functions[cd[op]] = function(op) {
                return function(args) {
                    return apply(op, args[0]);
                };
            }(op);
        }
    }
    // Create catalog of all variables that generate special MPFo math code (and
    // not <ci>...</ci>).
    var variables = {
        //"false": {"cd": "logic1"},
        //"infinity": {"cd": "nums1"},
        "otherwise": {"cd": "piece1"}, // used for piece-wise defined functions
        //"true": {"cd": "logic1"},
    };

    // Iterate all symbols known to the engine and create functions for units
    // and prefixes that generate corresponding MPFo math code.
    for (var symbol_name in engine.symbols) {
        var symbol = engine.symbols[symbol_name];
        if (symbol.attrs.group == "units") {
            variables[symbol_name] = {"cd": symbol.attrs.cd};
        } else if (symbol.attrs.group == "prefixes") {
            functions[symbol_name] = function(symbol_name) {
                return function(args) {
                    return apply("prefix", ['<prefix>' + symbol_name + '</prefix>', args[0]]);
                };
            }(symbol_name);
        }
    }

    functions["-"] = function(args) {
        if (args.length == 1) {
            var number;
            if (number = rxNumber.exec(args[0])) {
                if (number[1].startsWith('-')) {
                    throw Error("Unsupported number format: -" + number[1]);
                }
                return '<Double>' + '-' + number[1] + '</Double>';
            } else if (number = rxInteger.exec(args[0])) {
                if (number[1].startsWith('-')) {
                    throw Error("Unsupported number format: -" + number[1]);
                }
                return '<Integer>' + '-' + number[1] + '</Integer>';
            } else {
                return apply("unary_minus", args);
            }
        } else {
            return apply("minus", args);
        }
    };

    functions["cases"] = function(args) {
        // each element in args[0] is a piece
        var pieces = args[0].map(function(piece) {
            return apply("piece", piece);
        });
        return apply("piecewise", pieces);
    };

    functions["defintegral"] = function(args) {
        var lower_bound = args[0];
        var upper_bound = args[1];
        var variable = rxVariable.exec(args[3]);
        if (variable === null) {
            throw Error("Variable of integration required.");
        }
        return apply("defint", [
            '<QuantityInterval>' +
            '<LowerBound>' + lower_bound + '</LowerBound>' +
            '<UpperBound>' + upper_bound + '</UpperBound>' +
            '</QuantityInterval>',
            bind("lambda", [variable[0]], args[2])
        ]);
    };

    functions["derivative"] = function(args) {
        var variable = rxVariable.exec(args[1]);
        if (variable === null) {
            throw Error("Variable of differentiation required.");
        }
        return apply("diff", [
            bind("lambda", [variable[0]], args[0])
        ]);
    };

    functions["integral"] = function(args) {
        var variable = rxVariable.exec(args[1]);
        if (variable === null) {
            throw Error("Variable of integration required.");
        }
        return apply("int", [
            bind("lambda", [variable[0]], args[0])
        ]);
    };

    functions["list"] = function(args) {
        return args;
    };

    functions["matrix"] = function(args) {
        throw Error("Matrices are not supported");
        // each element in args[0] is a row
        var rows = args[0].map(function(row) {
            return apply("matrixrow", row);
        });
        return apply("matrix", rows);
    };

    functions["product"] = function(args) {
        throw Error("Products using the product symbol (capital Greek letter pi) are not supported"); 
        var variable = rxVariable.exec(args[0]);
        if (variable === null) {
            throw Error("Lower bound must assign a value to a variable.");
        }
        var lower_bound = args[1];
        var upper_bound = args[2];
        var fun = args[3];
        return apply("product", [
            apply("integer_interval", [lower_bound, upper_bound]),
            bind("lambda", [variable[0]], fun)
        ]);
    };

    functions["squareroot"] = function(args) {
        return apply("root", [args[0], wrapXML('Integer', '2')]);
    };

    functions["subscript"] = function(args) {
        var variable = rxVariable.exec(args[0]);
        if (variable === null) {
            throw Error("Only variables may have subscripts.");
        }
        var subscript =  rxVariable.exec(args[1])
            || rxInteger.exec(args[1]);
        if (subscript === null) {
            throw Error("Subscript has to be an integer or variable.");
        }
        return '<Identifier name="' + variable[1] + '_' + subscript[1] + '"/>';
    };

    functions["summation"] = function(args) {
        throw Error("Sums using the sum symbol (capital Greek letter sigma) are not supported"); 
        var variable = rxVariable.exec(args[0]);
        if (variable === null) {
            throw Error("Lower bound must assign a value to a variable.");
        }
        var lower_bound = args[1];
        var upper_bound = args[2];
        var fun = args[3];
        return apply("sum", [
            apply("integer_interval", [lower_bound, upper_bound]),
            bind("lambda", [variable[0]], fun)
        ]);
    };

    functions["root"] = function(args) {
        return apply("root", [args[1], args[0]]);
    };

    functions["val"] = function(args) {
        if (/^[+-]?\d+$/.exec(args[0])) {
            return wrapXML('Integer', args[0]);
        } else {
            return wrapXML('Double', args[0]);
        }
    };

    functions["var"] = function(args) {
        if (args[0] in variables) {
            if (['SI_BaseUnits1', 'SI_NamedDerivedUnits1', 'SIUsed_OffSystemUnits1'].includes(variables[args[0]].cd)) {
                return '<SIUnitRef unitRef="mpfo://mpfo.org/si-units/v1#' + args[0] + '"/>';
            } else {
                return baseFunctionRef(args[0]);
            }
        } else {
            return '<Identifier name="' + args[0] + '"/>';
        }
    };

    var ans = "";
    // Do not evaluate the AST if it is empty.
    if (typeof(doc.syntax_tree()[1]) != "undefined") {
        ans = doc.evaluate(functions);
    }
    var mpfo_math = (new window.DOMParser()).parseFromString('<Math>' + ans + '</Math>', "text/xml")

    // Iterate over all apply blocks and combine prefix and unit
    var function_calls = mpfo_math.querySelectorAll("Apply");
    var function_calls_length = function_calls.length;
    for (var i = 0; i < function_calls_length; i++) {
        var function_call = function_calls[i];
        if (function_call.childElementCount == 3) {
            var fun = function_call.childNodes[0];
            var c1 = function_call.childNodes[1];
            var c2 = function_call.childNodes[2];
            if (fun.nodeName == "BaseFunctionRef" &&
                fun.getAttribute("ref") == "mpfo://mpfo.org/std-functions/v1#prefix") {
                if (c1.nodeName != "prefix") {
                    throw Error("Unit prefix expected.");
                }
                if (c2.nodeName != "SIUnitRef") {
                    throw Error("Unit expected.");
                }
                // duplicate SIUnitRef node
                var unit = mpfo_math.createElement("SIUnitRef");
                // add prefix and unit
                unit.setAttribute("prefixRef", "mpfo://mpfo.org/si-prefixes/v1#" + c1.firstChild.nodeValue);
                unit.setAttribute("unitRef", c2.getAttribute("unitRef"));
                // replace original Apply node with new SIUnitRef node
                function_call.parentNode.replaceChild(unit, function_call);
            }
        }
    }

    // Iterate over all apply blocks and combine numbers/vectors/tensors and units
    var function_calls = mpfo_math.querySelectorAll("Apply");
    var function_calls_length = function_calls.length;
    for (var i = 0; i < function_calls_length; i++) {
        var function_call = function_calls[i];
        if (function_call.childElementCount == 3) {
            var fun = function_call.childNodes[0];
            var c1 = function_call.childNodes[1];
            var c2 = function_call.childNodes[2];
            if (fun.nodeName == "BaseFunctionRef" &&
                fun.getAttribute("ref") == "mpfo://mpfo.org/std-functions/v1#times" &&
                c2.nodeName == "SIUnitRef" ) {
                if (c1.nodeName == "Double" || c1.nodeName == "Integer") {
                    var scalar_quantity = mpfo_math.createElement('ScalarQuantity');
                    scalar_quantity.appendChild(c2);
                    scalar_quantity.appendChild(c1);
                    function_call.parentNode.replaceChild(scalar_quantity, function_call);
                }
            }
        }
    }


    return mpfo_math;
}
