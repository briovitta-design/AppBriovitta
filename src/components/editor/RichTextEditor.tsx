"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Color from "@tiptap/extension-color";
import { TextStyle, FontSize } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import { useEffect } from "react";
import {
  Bold,
  Italic,
  UnderlineIcon,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  IndentIncrease,
  IndentDecrease,
  List,
  ListOrdered,
  Table as TableIcon,
  Eraser,
} from "lucide-react";
import { Indent } from "./extensoes";

const TAMANHOS_FONTE = ["10pt", "11pt", "12pt", "14pt", "16pt", "18pt", "24pt"];

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  editable = true,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  editable?: boolean;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      FontSize,
      Indent,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["paragraph", "heading"] }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: value,
    immediatelyRender: false,
    editable,
    editorProps: {
      attributes: {
        class: [
          "editor-conteudo min-h-[300px] w-full border border-disabled bg-bg px-3 py-2 text-sm text-text-main focus:outline-none",
          editable ? "rounded-b-md border-t-0" : "rounded-md",
        ].join(" "),
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  // Quando o conteúdo é trocado de fora (ex.: IA gerou um texto novo),
  // reflete no editor — sem isso o TipTap ignora updates de `value` depois
  // da montagem inicial.
  useEffect(() => {
    if (!editor) return;
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  useEffect(() => {
    editor?.setEditable(editable);
  }, [editable, editor]);

  if (!editor) return null;

  const btn = (ativo: boolean) =>
    `rounded p-1.5 hover:bg-bg-secondary ${ativo ? "bg-bg-secondary text-primary" : "text-text-secondary"}`;

  return (
    <div>
      {editable && (
      <div className="flex flex-wrap items-center gap-1 rounded-t-md border border-disabled bg-card px-2 py-1.5">
        <select
          onChange={(e) => {
            const nivel = e.target.value;
            if (nivel === "p") editor.chain().focus().setParagraph().run();
            else editor.chain().focus().toggleHeading({ level: Number(nivel) as 2 | 3 }).run();
          }}
          value={
            editor.isActive("heading", { level: 2 })
              ? "2"
              : editor.isActive("heading", { level: 3 })
                ? "3"
                : "p"
          }
          className="rounded border border-disabled bg-bg px-1.5 py-1 text-xs text-text-main"
          title="Título de seção"
        >
          <option value="p">Texto normal</option>
          <option value="2">Título</option>
          <option value="3">Subtítulo</option>
        </select>

        <span className="mx-1 h-5 w-px bg-disabled" />

        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={btn(editor.isActive("bold"))} title="Negrito">
          <Bold className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={btn(editor.isActive("italic"))} title="Itálico">
          <Italic className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={btn(editor.isActive("underline"))} title="Sublinhado">
          <UnderlineIcon className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} className={btn(editor.isActive("strike"))} title="Tachado">
          <Strikethrough className="h-4 w-4" />
        </button>

        <span className="mx-1 h-5 w-px bg-disabled" />

        <input
          type="color"
          onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
          title="Cor do texto"
          className="h-7 w-7 cursor-pointer rounded border border-disabled bg-transparent p-0.5"
        />
        <input
          type="color"
          onChange={(e) => editor.chain().focus().toggleHighlight({ color: e.target.value }).run()}
          title="Marca-texto"
          className="h-7 w-7 cursor-pointer rounded border border-disabled bg-transparent p-0.5"
        />
        <button
          type="button"
          onClick={() => editor.chain().focus().unsetAllMarks().unsetFontSize().run()}
          className={btn(false)}
          title="Limpar formatação"
        >
          <Eraser className="h-4 w-4" />
        </button>

        <span className="mx-1 h-5 w-px bg-disabled" />

        <select
          onChange={(e) => {
            if (e.target.value) editor.chain().focus().setFontSize(e.target.value).run();
            else editor.chain().focus().unsetFontSize().run();
          }}
          className="rounded border border-disabled bg-bg px-1.5 py-1 text-xs text-text-main"
          defaultValue=""
          title="Tamanho da fonte"
        >
          <option value="">Tamanho</option>
          {TAMANHOS_FONTE.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <span className="mx-1 h-5 w-px bg-disabled" />

        <button type="button" onClick={() => editor.chain().focus().setTextAlign("left").run()} className={btn(editor.isActive({ textAlign: "left" }))} title="Alinhar à esquerda">
          <AlignLeft className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().setTextAlign("center").run()} className={btn(editor.isActive({ textAlign: "center" }))} title="Centralizar">
          <AlignCenter className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().setTextAlign("right").run()} className={btn(editor.isActive({ textAlign: "right" }))} title="Alinhar à direita">
          <AlignRight className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().setTextAlign("justify").run()} className={btn(editor.isActive({ textAlign: "justify" }))} title="Justificar">
          <AlignJustify className="h-4 w-4" />
        </button>

        <span className="mx-1 h-5 w-px bg-disabled" />

        <button type="button" onClick={() => (editor.chain().focus() as any).outdent().run()} className={btn(false)} title="Diminuir recuo">
          <IndentDecrease className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => (editor.chain().focus() as any).indent().run()} className={btn(false)} title="Aumentar recuo">
          <IndentIncrease className="h-4 w-4" />
        </button>

        <span className="mx-1 h-5 w-px bg-disabled" />

        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={btn(editor.isActive("bulletList"))} title="Lista com marcadores">
          <List className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btn(editor.isActive("orderedList"))} title="Lista numerada">
          <ListOrdered className="h-4 w-4" />
        </button>

        <span className="mx-1 h-5 w-px bg-disabled" />

        <button
          type="button"
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          className={btn(false)}
          title="Inserir tabela"
        >
          <TableIcon className="h-4 w-4" />
        </button>
      </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}
