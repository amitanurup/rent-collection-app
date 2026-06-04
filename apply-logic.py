
with open("new_logic.txt", "r", encoding="utf-8") as f:
    new_logic = f.read()

with open("assets/js/rent-collection.js", "r", encoding="utf-8") as f:
    code = f.read()

# Replace readFromDb and writeToDb
import re
code = re.sub(r"async function readFromDb\(key\) \{[\s\S]*?async function deleteFromDb", new_logic + "\nasync function deleteFromDb", code)

with open("assets/js/rent-collection.js", "w", encoding="utf-8") as f:
    f.write(code)

print("Applied!")

