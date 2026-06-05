<?php
$id = isset($_GET["id"]) ? $_GET["id"] : "";
if ($id) {
    $linksFile = "rent-links.json";
    if (file_exists($linksFile)) {
        $links = json_decode(file_get_contents($linksFile), true);
        if (isset($links[$id])) {
            header("Location: " . $links[$id]);
            exit();
        }
    }
}
echo "Link not found or expired.";
?>
