import { Extension } from "@tiptap/core";

// TipTap não tem extension oficial de recuo — segue o mesmo padrão do
// FontSize (que já vem pronto em @tiptap/extension-text-style na v3):
// um atributo customizado que vira um estilo CSS inline.

export const Indent = Extension.create({
  name: "indent",
  addOptions() {
    return { types: ["paragraph", "heading"], minLevel: 0, maxLevel: 8, step: 24 };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          indent: {
            default: 0,
            parseHTML: (element) => {
              const valor = element.style.marginLeft;
              return valor ? Math.round(parseInt(valor, 10) / this.options.step) : 0;
            },
            renderHTML: (attributes) => {
              if (!attributes.indent) return {};
              return { style: `margin-left: ${attributes.indent * this.options.step}px` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      indent:
        () =>
        ({ tr, state, dispatch }: any) => {
          const { selection } = state;
          state.doc.nodesBetween(selection.from, selection.to, (node: any, pos: number) => {
            if (this.options.types.includes(node.type.name)) {
              const nivel = Math.min((node.attrs.indent || 0) + 1, this.options.maxLevel);
              tr.setNodeAttribute(pos, "indent", nivel);
            }
          });
          if (dispatch) dispatch(tr);
          return true;
        },
      outdent:
        () =>
        ({ tr, state, dispatch }: any) => {
          const { selection } = state;
          state.doc.nodesBetween(selection.from, selection.to, (node: any, pos: number) => {
            if (this.options.types.includes(node.type.name)) {
              const nivel = Math.max((node.attrs.indent || 0) - 1, this.options.minLevel);
              tr.setNodeAttribute(pos, "indent", nivel);
            }
          });
          if (dispatch) dispatch(tr);
          return true;
        },
    } as any;
  },
});
