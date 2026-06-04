const fs = require('fs');

async function run() {
  try {
    const backupData = JSON.parse(fs.readFileSync('c:\\Users\\amita\\Desktop\\rent-collection-backup.json', 'utf8'));
    const state = backupData.state;

    // Read token from environment variable instead of hardcoding
    const token = process.env.GITHUB_TOKEN;
    if (!token) throw new Error("GITHUB_TOKEN environment variable not set");
    const gistId = "e6074ee14fc1506ed012f42f894a16d7";

    state.profile.githubToken = token;
    state.profile.githubGistId = gistId;

    const gistContent = JSON.stringify({
      value: state,
      _timestamp: Date.now() + 10000 // Ensure this timestamp is definitely newer than local!
    });

    const body = {
      files: {
        "app-state.json": {
          content: gistContent
        }
      }
    };

    const response = await fetch(`https://api.github.com/gists/${gistId}`, {
      method: "PATCH",
      headers: {
        "Authorization": `token ${token}`,
        "Accept": "application/vnd.github.v3+json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (response.ok) {
      console.log("Success!");
    } else {
      console.log("Failed:", await response.text());
    }
  } catch(e) {
    console.error(e);
  }
}

run();
