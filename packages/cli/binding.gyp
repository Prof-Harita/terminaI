{
  "targets": [
    {
      "target_name": "terminai_native",
      "sources": [
        "native/main.cpp",
        "native/appcontainer_manager.cpp",
        "native/amsi_scanner.cpp",
        "native/pipe_security.cpp"
      ],
      "include_dirs": ["<!@(node -p \"require('node-addon-api').include\")"],
      "dependencies": ["<!(node -p \"require('node-addon-api').gyp\")"],
      "cflags!": ["-fno-exceptions"],
      "cflags_cc!": ["-fno-exceptions"],
      "defines": [
        "NAPI_DISABLE_CPP_EXCEPTIONS"
      ],
      "conditions": [
        [
          "OS=='win'",
          {
            "msvs_settings": {
              "VCCLCompilerTool": {
                "ExceptionHandling": 1,
                "AdditionalOptions": ["/EHsc"]
              }
            },
            "libraries": [
              "-lUserenv.lib",
              "-lAdvapi32.lib",
              "-lAmsi.lib",
              "-lKernel32.lib",
              "-lOle32.lib"
            ],
            "defines": [
              "UNICODE",
              "_UNICODE",
              "WIN32_LEAN_AND_MEAN"
            ]
          }
        ],
        [
          "OS!='win'",
          {
            "sources": [
              "native/stub.cpp"
            ]
          }
        ]
      ]
    }
  ]
}
