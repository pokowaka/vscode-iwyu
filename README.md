# Include What You Use

"Include what you use" means this: for every symbol (type, function variable, or macro) that you use in foo.cc, either foo.cc or foo.h should #include a .h file that exports the declaration of that symbol. The include-what-you-use tool is a program that can be built with the clang libraries in order to analyze #includes of source files to find include-what-you-use violations, and suggest fixes for them.

The main goal of include-what-you-use is to remove superfluous #includes. It does this both by figuring out what #includes are not actually needed for this file (for both .cc and .h files), and replacing #includes with forward-declares when possible.

## Features

Optimize the include files for the current C/C++ file:

![Include What You Use](images/small_demo.gif)

> Tip: Many popular extensions utilize animations. This is an excellent way to show off your extension! We recommend short, focused animations that are easy to follow.

## Requirements

You will need to install [include-what-you-use](https://include-what-you-use.org/). For example on mac:

```sh
brew install include-what-you-use
```

## Extension Settings

This extension contributes the following settings:

- `iwyu.exe`: Path to the include what you use executable.
- `compile_commands` Path to compile_commands.json file.
- `iwyu.mapping_files`: List of mapping files to use.
- `iwyu.transitive_includes_only`: Do not suggest that a file add foo.h unless foo.h is already visible in the file's transitive includes.
- `iwyu.max_line_length`: Maximum line length for includes.Note that this only affects comments and alignment thereof, the maximum line length can still be exceeded with long file names
- `iwyu.comments`: Add 'why' comments.
- `iwy.additional_params`: Additional parameters you wish to pass to iwyu.  Must be prefixed with a `-Xiwyu` flag

## Known Issues

- Changes in compile_commands.json are not detected.

## Release Notes


### 1.0.0

Initial release of include what you use.
