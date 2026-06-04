<?php
/**
 * Rent Collection App - Custom Server Sync Backend
 * Instructions:
 * 1. Upload this file to your hosting (e.g. inside public_html).
 * 2. Change the \ below to a strong password.
 * 3. In the Rent App, enter the URL to this file (e.g. https://yourwebsite.com/rent-sync.php) and your Secret Key.
 */

// CHANGE THIS PASSWORD!
\ = "Amit@1234";

// The file where data will be saved
\ = "rent-database.json";

// Allow Cross-Origin Requests from the app
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Secret-Key");
header("Content-Type: application/json");

// Handle preflight OPTIONS request
if (\['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Get the Secret Key from Headers or Query params
\ = '';
if (isset(\['HTTP_X_SECRET_KEY'])) {
    \ = \['HTTP_X_SECRET_KEY'];
} elseif (isset(\['key'])) {
    \ = \['key'];
}

// Verify Secret Key
if (\ !== \) {
    http_response_code(401);
    echo json_encode(["error" => "Unauthorized: Invalid Secret Key"]);
    exit();
}

// GET Request: Download Data
if (\['REQUEST_METHOD'] === 'GET') {
    if (file_exists(\)) {
        echo file_get_contents(\);
    } else {
        echo json_encode(["_timestamp" => 0, "value" => null]);
    }
    exit();
}

// POST Request: Upload Data
if (\['REQUEST_METHOD'] === 'POST') {
    \ = file_get_contents('php://input');
    
    // Validate JSON
    \ = json_decode(\, true);
    if (json_last_error() === JSON_ERROR_NONE && isset(\['value'])) {
        // Save to file
        file_put_contents(\, \);
        echo json_encode(["success" => true, "message" => "Data saved successfully!"]);
    } else {
        http_response_code(400);
        echo json_encode(["error" => "Invalid JSON payload"]);
    }
    exit();
}

// If not GET or POST
http_response_code(405);
echo json_encode(["error" => "Method Not Allowed"]);
