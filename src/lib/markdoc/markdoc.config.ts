import Markdoc from "@markdoc/markdoc";
import type { Config } from "@markdoc/markdoc";

const { nodes, Tag } = Markdoc;

/*
  Markdoc是一个用Markdown编写内容的好工具。
  它支持所有默认的markdown语法，并允许你配置和使用自定义语法来渲染你自己的组件。

  Markdoc的工作原理是这样的：
  1. 它接受一个配置（这个文件）
  2. 它解析内容（markdown）
  3. 它生成一个树状的内容数据结构
  4. 我们在Astro页面中使用astro-markdoc-renderer包渲染树
*/

/* 
  Markdoc配置在这里。
  https://markdoc.dev/docs/config 

  - 如果你想支持一个自定义元素，只需
    将其添加到config.tags（例如，youtube）。一旦在这里添加，
    你就可以在markdown文件中使用自定义组件语法。
    一旦在这里添加，你可以在
    `Renderer.astro`文件中为它添加一个Astro组件。查看`YouTubeEmbed`作为示例。

  - 默认情况下，默认的markdown标签会自动渲染
    在默认的html元素中。例如，#会被渲染在<h1>中，段落
    会被渲染在<p>中。如果你想自定义如何渲染默认的markdown
    元素，将元素的配置添加到`config.nodes`。
    这并不容易，但我们已经为标题做了这个
    你可以从nodes.heading中复制粘贴代码到你想要
    自定义的标签（例如，段落）。一旦在这里添加，添加一个Astro组件
    为它在`Renderer.astro`文件中。查看`heading`作为示例。
*/
export const config: Config = {
  tags: {
    details: {
      render: "details",
      children: nodes.document.children,
    },
    summary: {
      render: "summary",
      children: nodes.document.children,
    },
    sup: {
      render: "sup",
      children: nodes.strong.children,
    },
    sub: {
      render: "sub",
      children: nodes.strong.children,
    },
    abbr: {
      render: "abbr",
      attributes: {
        title: { type: String },
      },
      children: nodes.strong.children,
    },
    kbd: {
      render: "kbd",
      children: nodes.strong.children,
    },
    mark: {
      render: "mark",
      children: nodes.strong.children,
    },
    youtube: {
      render: "YouTubeEmbed",
      attributes: {
        url: { type: String, required: true },
        label: { type: String, required: true },
      },
      selfClosing: true,
    },
    tweet: {
      render: "TweetEmbed",
      attributes: {
        url: { type: String, required: true },
      },
      selfClosing: true,
    },
    codepen: {
      render: "CodePenEmbed",
      attributes: {
        url: { type: String, required: true },
        title: { type: String, required: true },
      },
      selfClosing: true,
    },
    githubgist: {
      render: "GitHubGistEmbed",
      attributes: {
        id: { type: String, required: true },
      },
      selfClosing: true,
    },
  },
  nodes: {
    heading: {
      render: "Heading",
      attributes: {
        level: { type: Number, required: true },
      },
      transform(node, config) {
        const attributes = node.transformAttributes(config);
        const children = node.transformChildren(config);
        return new Tag(this.render, { ...attributes }, children);
      },
    },
    // 如果你想自定义默认标签，这就是你要做的地方
    // 在这里添加代码后，为这个节点添加一个Astro组件
    // 在Renderer.astro组件中
    // paragraph: {
    //   render: "paragraph",
    //   transform(node, config) {
    //     const attributes = node.transformAttributes(config);
    //     const children = node.transformChildren(config);
    //     return new Tag(this.render, { ...attributes }, children);
    //   },
    // },
    fence: {
      render: "CodeBlock",
      attributes: {
        content: { type: String, render: false, required: true },
        language: { type: String, default: "typescript" },
        // process determines whether or not markdoc processes tags inside the content of the code block
        process: { type: Boolean, render: false, default: false },
      },
      transform(node, config) {
        const attributes = node.transformAttributes(config);
        const children = node.transformChildren(config);
        if (children.some((child) => typeof child !== "string")) {
          throw new Error(
            `unexpected non-string child of code block from ${
              node.location?.file ?? "(unknown file)"
            }:${node.location?.start.line ?? "(unknown line)"}`
          );
        }
        return new Tag(
          this.render,
          { ...attributes, content: children.join("") },
          []
        );
      },
    },
  },
};
