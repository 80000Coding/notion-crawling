import { Client } from '@notionhq/client'
import { NotionToMarkdown } from 'notion-to-md'
import 'dotenv/config'
import fs from 'fs'

const maxDepth = 1
const databaseId = '94e689f5b19947b1ab0f9b5f2d52962b'
const notion = new Client({
  auth: process.env.NOTION_API_TOKEN,
})

const n2m = new NotionToMarkdown({ notionClient: notion })

async function notionDatabaseQuery(databaseId: string, startCursor?: string) {
  return notion.databases.query({
    database_id: databaseId,
    start_cursor: startCursor,
    page_size: 100,
    sorts: [
      {
        property: 'create_date',
        direction: 'descending',
      },
    ],
  })
}

async function getAllPagesInDatabase() {
  let allPages: string[] = []
  let cursor = undefined
  let depth = 0

  while (true) {
    if (depth >= maxDepth) break
    const { results, next_cursor } = await notionDatabaseQuery(databaseId, cursor)
    results.forEach((page) => {
      allPages.push(page.id)
    })
    if (!next_cursor) {
      break
    }
    cursor = next_cursor
    depth++
  }
  return allPages
}

async function saveAllPages(allPages: string[]) {
  let notPages: string[] = []
  for (const pageId of allPages) {
    const mdblocks = await n2m.pageToMarkdown(pageId)
    const mdString = n2m.toMarkdownString(mdblocks)
    try {
      fs.writeFileSync(`posts/${pageId}.md`, mdString.parent)
    } catch (error) {
      notPages.push(pageId)
    }
  }
  return notPages
}

;(async () => {
  const allPages = await getAllPagesInDatabase()

  const notPages = await saveAllPages(allPages)
  console.log(notPages)
  console.log('done 😀')
})()
