    function codeMirrorEditor(cmDiv, content="",  languageServerCallback=null, theme="eclipse", mode="text/x-java") {
      var editor = CodeMirror.fromTextArea(
        document.getElementById("editor"),
        {
          mode:        mode,
          theme:       theme,
          lineNumbers: true,
          matchBrackets: true
        }
      );  

      if (content) editor.getDoc().setValue(content);

      editor.on("change", function(editor, change) {
        var code = editor.getValue();
        if (languageServerCallback)
          languageServerCallback(editor, change);
      });

      return editor;    
    }
function duplicateChar(editor, change) {
  if (change.origin !== "+input") return;

  const inserted = change.text;
  if (!inserted || inserted.length !== 1) return;

  const char = inserted[0];
  if (char.length !== 1) return;

  const cursor = editor.getCursor();
  editor.replaceRange(char, cursor, cursor, "duplicate");
}