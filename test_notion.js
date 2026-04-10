const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const account = await prisma.account.findFirst({
    where: { provider: 'notion' }
  });

  if (!account || !account.access_token) {
    console.log('No notion token');
    return;
  }

  const token = account.access_token;
  const res = await fetch('https://api.notion.com/v1/search', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      filter: { value: 'page', property: 'object' },
      page_size: 5
    })
  });

  const data = await res.json();
  console.log('Search Results:', data.results.length);

  if (data.results.length > 0) {
    for (const page of data.results) {
        console.log('Testing page', page.id);
        const bRes = await fetch(`https://api.notion.com/v1/blocks/${page.id}/children`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Notion-Version': '2022-06-28'
        }
        });
        const bData = await bRes.json();
        console.log(`Page ${page.id} blocks:`, bData.results ? bData.results.length : bData);
    }
  }
}

run();
