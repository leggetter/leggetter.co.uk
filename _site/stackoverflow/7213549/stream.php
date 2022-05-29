<?php
$updates = $_GET['updates'];
if(!$updates) {
  $updates = 100;
}
$padding = intval($_GET['padding']);
if(!$padding || $padding > 32000){
  $padding = 5000;
}

header('HTTP/1.1 200 OK');
Header('Content-type: text/plain');
echo('sending padding of ' . $padding);
echo str_pad('PADDING', $padding, '|PADDING');

$sleep_time = 1;
$count = 0;
$update_suffix = 'Just keep streaming, streaming, streaming. Just keep streaming.';
while($count < 100) {
  $message = $count . ' >> ' . $update_suffix;
  echo($message);
  ob_flush();
  flush();
  $count = $count + 1;
  sleep($sleep_time);
}
?>