<?php

// Retained as a tombstone so deploying over an older installation removes its executor.
http_response_code(404);
header('Content-Type: application/json');
echo json_encode(['error' => 'Not found']);
exit;
