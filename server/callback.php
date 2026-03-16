<?php
header('Content-Type: text/plain');

$sessionId   = $_POST['sessionId'] ?? '';
$serviceCode = $_POST['serviceCode'] ?? '';
$phoneNumber = $_POST['phoneNumber'] ?? '';
$text        = $_POST['text'] ?? '';

if ($text == "") {
    echo "CON Welcome to SRC Voting\n";
    echo "1. Vote\n";
    echo "2. Check Status";
} 
else if ($text == "1") {
    echo "CON Enter nominee ID";
}
else if (preg_match('/^1\*\d+$/', $text)) {
    $parts = explode("*", $text);
    $nomineeId = $parts[1];

    // Save to DB here

    echo "END Your vote for nominee ID $nomineeId has been recorded.";
}
else if ($text == "2") {
    echo "END Voting status: Active";
}
else {
    echo "END Invalid choice";
}
?>