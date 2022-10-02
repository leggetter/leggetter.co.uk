<?php
require('squeeks-Pusher-PHP-0defb40/lib/Pusher.php');
header('Content-Type: application/json');

$app_id = '8288';
$key = 'a71b8d8b7eef0ef6d98c';
$secret = '90b0ea5292de35b367f1';
$pusher = new Pusher($key, $secret, $app_id);

$channel_name = $_POST['channel_name'];
if(!$channel_name) {
    $channel_name = $_GET['channel_name'];
}
$socket_id = $_POST['socket_id'];
if(!$socket_id) {
    $socket_id = $_GET['socket_id'];
}

$username = $_POST['username'];
if(!$username) {
  $username = $_GET['username'];
}

if(!$username) {
  exit('A username must be provided');
}

$presence_data = array('username' => $username);

echo $pusher->presence_auth($channel_name, $socket_id, $username, $presence_data);
?>