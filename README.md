# MPFo Math Editor

Mission profiles (MP) describe all functional and environmental loads a set of components or complex systems have to sustain during production, storage, shipping, assembly and operation.
Additionally, they can also be used to communicate the load capabilities of components and technologies.

In the publicly funded project [ELDA-MP](https://www.dke.de/de/arbeitsfelder/core-safety/elda-mp) (German), we strive to standardize an electronic data format for these mission profiles.

One aspect of this Mission Profile Format (MPFo) is to describe physical quantities and mathematical expressions using XML.

This editor helps to create these MPFo math expressions.

## Demo

Visit https://ifte-eda.github.io/mpfo-math-editor/ for a simple demo page that displays the generated MPFo math (XML) code.

## Screenshot

![Screenshot of the MPFo Math Editor](https://ifte-eda.github.io/mpfo-math-editor/screenshot.png "Screenshot")

## Features

- Support of custom symbols, e.g. type `Umax` and get the single symbol *U*<sub>max</sub> instead of the product *Umax* in the formula editor
- Support of SI prefixes and units
- Support of piecewise-defined expressions
- Automatic detection of physical quantities

## Installation

    $ cd docs
    $ npm install

## Usage

The editor component is provided by [Guppy](https://guppy.js.org) which is licensed under the [MIT License](https://opensource.org/licenses/MIT).

This package provides the function `guppy_xml_to_mpfo_math` to convert Guppy's internal XML format to MPFo math code.

For a simple demo web page with the formula editor and a text field displaying the resulting MPFo math code, the following files `index.html` and `mpfo-math-editor.js` are required.

### `index.html`

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <link rel="stylesheet" href="node_modules/guppy-js/guppy-default-osk.min.css">
    <script type="text/javascript" src="node_modules/guppy-js/guppy.min.js"></script>
    <script type="text/javascript" src="node_modules/guppy-js/guppy_osk.js"></script>
    <script type="text/javascript" src="https://cdn.jsdelivr.net/gh/vkiryukhin/vkBeautify@master/vkbeautify.js"></script>
    <script type="text/javascript" src="node_modules/mpfo-math-editor/guppy-xml-to-mpfo-math.js"></script>
    <script type="text/javascript" src="mpfo-math-editor.js"></script>
</head>

<body>
    <h2>Editor</h2>
    <div id="guppy1"></div>

    <h2>Result</h2>
    <div class="label">MPFo math: </div>
    <textarea type="text" id="output_mpfo_math" class="output" rows="30" cols="100"></textarea>
</body>
</html>
```

### `mpfo_math_editor.js`

```javascript
window.onload = function(){
    // ID of the editor's div
    var editor_id = "guppy1";
    // output textarea
    var output_mpfo_math = document.getElementById("output_mpfo_math");

    // update output textarea when editor content changes
    var update_output = function(e) {
        try {
            var engine = e.target.engine;
            var doc = engine.doc;
            var content = (new XMLSerializer()).serializeToString(guppy_xml_to_mpfo_math(engine, doc));
            content = vkbeautify.xml(content, 4);
            output_mpfo_math.value = content;
        }
        catch(e) {
            output_mpfo_math.value = "Failed to parse input: " + e.message;
        }
    }

    // tab completion after backslash prints all candidates in the output textarea
    var completion = function(e) {
        output_mpfo_math.value = e.candidates.join(", ");
    }

    Guppy.init({
        "osk":new GuppyOSK(),
        "path":"node_modules/guppy-js",
        "symbols":["node_modules/guppy-js/sym/symbols.json","node_modules/mpfo-math-editor/mpfo-math-symbols.json"],
        "events": {
            "ready": update_output,
            "change": update_output,
            "completion": completion
        },
        "settings":{
            "empty_content": "{\\text{Click to start typing math!}}"
        },
    });

    var g1 = new Guppy(editor_id);
}
```

## Custom Symbols

You can define custom mathematical/physical symbols for later use in the formula.

**Example:** By defining a custom symbol, you can type `Umax` in the formula editor and get the single symbol *U*<sub>max</sub> instead of the product *Umax*. In this case, the resulting MPFo math code is `<Identifier name="Umax"/>`.

```javascript
Guppy.add_global_symbol("Umax", {
    "output": {
        "latex": "U_\\text{max}",
        "asciimath": "Umax"
    },
    "attrs": {
        "group": "custom",
        "type": "Umax"
    }
});
```
