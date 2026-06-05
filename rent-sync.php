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
$INTAKES_FILE = "rent-intakes.json";

$SETTINGS_FILE = "rent-settings.json";

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

$action = isset($_GET['action']) ? $_GET['action'] : '';

if ($action === 'save_settings' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!isset($_SERVER['HTTP_X_SECRET_KEY']) || $_SERVER['HTTP_X_SECRET_KEY'] !== $SECRET_KEY) {
        http_response_code(401);
        echo json_encode(["error" => "Unauthorized"]);
        exit();
    }
    
    $input = file_get_contents('php://input');
    if ($input) {
        file_put_contents($SETTINGS_FILE, $input);
        echo json_encode(["success" => true]);
    } else {
        http_response_code(400);
        echo json_encode(["error" => "Invalid settings data"]);
    }
    exit();
}

// ---------------------------------------------------------
// UNAUTHENTICATED ROUTES (Public Tenant Intake)
// ---------------------------------------------------------

if ($action === 'submit_intake' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $json_data = file_get_contents('php://input');
    $decoded = json_decode($json_data, true);
    if (isset($decoded['mobile'])) {
        $intakes = file_exists($INTAKES_FILE) ? json_decode(file_get_contents($INTAKES_FILE), true) : [];
        if (!is_array($intakes)) $intakes = [];
        
        $decoded['id'] = uniqid('req_');
        $decoded['status'] = 'pending';
        $decoded['timestamp'] = time() * 1000;
        
        // Remove old pending requests for same mobile to avoid spam
        $intakes = array_filter($intakes, function($i) use ($decoded) {
            return !($i['mobile'] === $decoded['mobile'] && $i['status'] === 'pending');
        });
        
        $intakes[] = $decoded;
        file_put_contents($INTAKES_FILE, json_encode(array_values($intakes)));
        
        echo json_encode(["success" => true, "id" => $decoded['id']]);
        exit();
    }
    http_response_code(400);
    echo json_encode(["error" => "Invalid intake data"]);
    exit();
}

if ($action === 'check_intake' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $mobile = isset($_GET['mobile']) ? $_GET['mobile'] : '';
    if ($mobile) {
        $intakes = file_exists($INTAKES_FILE) ? json_decode(file_get_contents($INTAKES_FILE), true) : [];
        if (!is_array($intakes)) $intakes = [];
        
        $settings = file_exists($SETTINGS_FILE) ? json_decode(file_get_contents($SETTINGS_FILE), true) : [];
        if (!is_array($settings)) $settings = [];
        $globalUpiId = isset($settings['upiId']) ? $settings['upiId'] : "";
        $globalOwnerName = isset($settings['ownerName']) ? $settings['ownerName'] : "House Rent";
        
        $user_intakes = array_filter($intakes, function($i) use ($mobile) {
            return isset($i['mobile']) && $i['mobile'] === $mobile;
        });
        
        if (count($user_intakes) > 0) {
            usort($user_intakes, function($a, $b) { return $b['timestamp'] - $a['timestamp']; });
            $latest = array_values($user_intakes)[0];
            $response = ["found" => true, "status" => $latest['status'], "name" => $latest['name']];
            if (isset($latest['assignedData'])) {
                $response['assignedData'] = $latest['assignedData'];
                if (empty($response['assignedData']['upiId']) && !empty($globalUpiId)) {
                    $response['assignedData']['upiId'] = $globalUpiId;
                }
                $response['assignedData']['upiPayeeName'] = $globalOwnerName;
            }
            echo json_encode($response);
            exit();
        }
        echo json_encode(["found" => false]);
        exit();
    }
    http_response_code(400);
    echo json_encode(["error" => "Missing mobile"]);
    exit();
}

// ---------------------------------------------------------
// AUTHENTICATED ROUTES (Owner Dashboard)
// ---------------------------------------------------------

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

// GET Request: Get Intakes
if ($action === 'get_intakes' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    if (file_exists($INTAKES_FILE)) {
        echo file_get_contents($INTAKES_FILE);
    } else {
        echo json_encode([]);
    }
    exit();
}

// POST Request: Update Intake Status
if ($action === 'update_intake' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $json_data = file_get_contents('php://input');
    $decoded = json_decode($json_data, true);
    if (isset($decoded['id']) && isset($decoded['status'])) {
        $intakes = file_exists($INTAKES_FILE) ? json_decode(file_get_contents($INTAKES_FILE), true) : [];
        if (!is_array($intakes)) $intakes = [];
        
        foreach ($intakes as &$intake) {
            if ($intake['id'] === $decoded['id']) {
                $intake['status'] = $decoded['status'];
                if (isset($decoded['assignedData'])) {
                    $intake['assignedData'] = $decoded['assignedData'];
                }
            }
        }
        file_put_contents($INTAKES_FILE, json_encode($intakes));
        echo json_encode(["success" => true]);
        exit();
    }
    http_response_code(400);
    echo json_encode(["error" => "Invalid payload"]);
    exit();
}

// POST Request: Shorten URL
if ($action === 'shorten' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $json_data = file_get_contents('php://input');
    $decoded = json_decode($json_data, true);
    if (isset($decoded['url'])) {
        $longUrl = $decoded['url'];
        
        // Generate a 6-character random ID
        $shortId = substr(str_shuffle("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"), 0, 6);
        $linksFile = 'rent-links.json';
        
        // Read existing links
        $links = file_exists($linksFile) ? json_decode(file_get_contents($linksFile), true) : [];
        if (!is_array($links)) $links = [];
        
        // Save new link
        $links[$shortId] = $longUrl;
        file_put_contents($linksFile, json_encode($links));
        
        // Generate the short URL pointing to p.php
        $baseUrl = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http") . "://$_SERVER[HTTP_HOST]" . dirname($_SERVER['REQUEST_URI']);
        $shortUrl = $baseUrl . "/p.php?id=" . $shortId;
        
        echo json_encode(["shortUrl" => $shortUrl]);
        exit();
    }
    http_response_code(400);
    echo json_encode(["error" => "Failed to shorten url"]);
    exit();
}

// GET Request: Download Data
if ($_SERVER['REQUEST_METHOD'] === 'GET' && empty($action)) {
    if (file_exists($DATA_FILE)) {
        echo file_get_contents($DATA_FILE);
    } else {
        echo json_encode(["_timestamp" => 0, "value" => null]);
    }
    exit();
}

// POST Request: Upload Data
if ($_SERVER['REQUEST_METHOD'] === 'POST' && empty($action)) {
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

// If not GET or POST
http_response_code(405);
echo json_encode(["error" => "Method Not Allowed"]);
