{
  "targets": [
    {
      "target_name": "macos_window",
      "conditions": [
        ["OS=='mac'", { "sources": ["window_behavior.mm"] }]
      ],
      "link_settings": { "libraries": ["-framework AppKit"] },
      "xcode_settings": {
        "CLANG_CXX_LANGUAGE_STANDARD": "c++17",
        "MACOSX_DEPLOYMENT_TARGET": "11.0"
      }
    }
  ]
}
