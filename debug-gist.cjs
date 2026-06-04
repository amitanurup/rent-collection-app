const fs = require('fs');

async function debug() {
  const token = process.env.GITHUB_TOKEN;
  const gistId = "e6074ee14fc1506ed012f42f894a16d7";
  const response = await fetch(`https://api.github.com/gists/${gistId}`, {
    headers: {
      "Authorization": `token ${token}`,
      "Accept": "application/vnd.github.v3+json"
    }
  });
  if (response.ok) {
    const gist = await response.json();
    if (gist.files && gist.files["rent-collection-db.json"]) {
        const content = gist.files["rent-collection-db.json"].content;
        console.log("rent-collection-db.json found!");
        console.log("Length:", content.length);
        console.log(content.substring(0, 500));
    } else if (gist.files && gist.files["app-state.json"]) {
        const content = gist.files["app-state.json"].content;
        console.log("app-state.json found!");
        console.log("Length:", content.length);
        console.log(content.substring(0, 500));
    } else {
        console.log("Keys:", Object.keys(gist.files));
    }
  } else {
    console.log("Failed to fetch gist");
  }
}
debug();
