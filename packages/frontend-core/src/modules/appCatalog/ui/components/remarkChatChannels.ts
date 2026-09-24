/**
 * Remark plugin: turns bare chat-channel mentions (`#swaggerhub`) in markdown
 * text into links built from a URL template (`{name}` placeholder), so an
 * author can write "ask in Slack #swaggerhub" without hand-writing the URL.
 *
 * Only `text` nodes are rewritten; existing links, link references and code
 * are never touched. A mention is `#` preceded by start of text, whitespace or
 * `(`, followed by a name in the common channel grammar (lower-case letters,
 * digits, `.`, `_`, `-`; starts and ends with a letter or digit; max 80) and
 * not glued to further word characters. Digits-only (`#123`, an issue number)
 * and mid-word `#` (URL fragments like `?gid=0#gid=0`) are not mentions.
 */

type MdNode = {
  type: string
  value?: string
  url?: string
  children?: MdNode[]
}

const MENTION =
  /(^|[\s(])#([a-z0-9](?:[a-z0-9._-]{0,78}[a-z0-9])?)(?![A-Za-z0-9_-])/g

/** Node types whose text must stay verbatim. */
const KEEP_VERBATIM = new Set(['link', 'linkReference', 'inlineCode', 'code'])

export function remarkChatChannels(template: string) {
  const linkTo = (name: string): MdNode => ({
    type: 'link',
    url: template.replace('{name}', encodeURIComponent(name)),
    children: [{ type: 'text', value: `#${name}` }],
  })

  const splitText = (value: string): MdNode[] => {
    const out: MdNode[] = []
    let last = 0
    for (const m of value.matchAll(MENTION)) {
      const [, lead = '', name = ''] = m
      if (/^\d+$/.test(name)) continue
      const start = m.index + lead.length
      out.push({ type: 'text', value: value.slice(last, start) }, linkTo(name))
      last = start + name.length + 1
    }
    if (out.length === 0) return [{ type: 'text', value }]
    out.push({ type: 'text', value: value.slice(last) })
    return out.filter((n) => n.type !== 'text' || n.value)
  }

  const visit = (node: MdNode): void => {
    if (!node.children) return
    node.children = node.children.flatMap((child) => {
      if (KEEP_VERBATIM.has(child.type)) return [child]
      if (child.type !== 'text') {
        visit(child)
        return [child]
      }
      return splitText(child.value ?? '')
    })
  }

  return visit
}
