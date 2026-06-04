<?php
/**
 * Rent Collection App - Custom Server Sync Backend
 * Instructions:
 * 1. Upload this file to your hosting (e.g. inside public_html).
 * 2. Change the $SECRET_KEY below to a strong password.
 * 3. In the Rent App, enter the URL to this file (e.g. https://yourwebsite.com/rent-sync.php) and your Secret Key.
 */

// CHANGE THIS PASSWORD!
$SECRET_KEY = "Amit@1234";

// The file where data will be saved
$DATA_FILE = "rent-database.json";

// Allow Cross-Origin Requests from the app
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Secret-Key");
header("Content-Type: application/json");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Get the Secret Key from Headers or Query params
$provided_key = '';
if (isset($_SERVER['HTTP_X_SECRET_KEY'])) {
    $provided_key = $_SERVER['HTTP_X_SECRET_KEY'];
} elseif (isset($_GET['key'])) {
    $provided_key = $_GET['key'];
}

// Verify Secret Key
if ($provided_key !== $SECRET_KEY) {
    http_response_code(401);
    echo json_encode(["error" => "Unauthorized: Invalid Secret Key"]);
    exit();
}

// GET Request: Download Data
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (file_exists($DATA_FILE)) {
        echo file_get_contents($DATA_FILE);
    } else {
        echo json_encode(["_timestamp" => 0, "value" => null]);
    }
    exit();
}

// POST Request: Upload Data
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $json_data = file_get_contents('php://input');
    
    // Validate JSON
    $decoded = json_decode($json_data, true);
    if (json_last_error() === JSON_ERROR_NONE && isset($decoded['value'])) {
        // Save to file
        file_put_contents($DATA_FILE, $json_data);
        echo json_encode(["success" => true, "message" => "Data saved successfully!"]);
    } else {
        http_response_code(400);
        echo json_encode(["error" => "Invalid JSON payload"]);
    }
    exit();
}

// POST Request: Shorten URL
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_GET['action']) && $_GET['action'] === 'shorten') {
    $json_data = file_get_contents('php://input');
    $decoded = json_decode($json_data, true);
    if (isset($decoded['url'])) {
        $longUrl = $decoded['url'];
        $shortUrl = @file_get_contents("https://tinyurl.com/api-create.php?url=" . urlencode($longUrl));
        if ($shortUrl) {
            echo json_encode(["shortUrl" => $shortUrl]);
            exit();
        }
    }
    http_response_code(400);
    echo json_encode(["error" => "Failed to shorten url"]);
    exit();
}

// If not GET or POST
http_response_code(405);
echo json_encode(["error" => "Method Not Allowed"]);
