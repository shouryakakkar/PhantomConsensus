async function run() { 
  const res = await fetch('https://slack.com/api/users.list?limit=200', { 
    headers: { Authorization: 'Bearer <YOUR_SLACK_BOT_TOKEN>' }
  }); 
  const data = await res.json(); 
  console.log(data); 
} 
run();
