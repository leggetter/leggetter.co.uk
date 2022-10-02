<?php
error_reporting(E_ALL);
ini_set('display_errors', '1');

require('squeeks-Pusher-PHP-0defb40/lib/Pusher.php');
require('config.php');

header('Content-Type: text/javascript');

// MYSQL STUFF
$con = mysql_connect("localhost", $db_username, $db_password);
if (!$con)
{
  die('Could not connect: ' . mysql_error());
}

mysql_select_db($db_name, $con);

$who = mysql_real_escape_string($_GET['who']);
$how_much = mysql_real_escape_string($_GET['how_much']);

if( !$who || !$how_much || !is_numeric($how_much) ) {
  die('unsupported who and how_much values');
}

$running_total = 0;
$last_update = "SELECT * FROM $db_tablename ORDER BY id DESC LIMIT 1";
if( !$last_update ) {
  die( 'cannot get last update from db' );
}
$result = mysql_query($last_update);

if( !isset( $_GET['reset_total'] ) && $result) {
  $row = mysql_fetch_array($result);
  $running_total = $row['running_total'];
}

$running_total = $running_total + $how_much;

$insert_query = "INSERT INTO givecampuk (who, how_much, running_total) ";
$insert_query .= sprintf( "VALUES('%s', %f, %f)", $who, $how_much, $running_total );

$insert_result = mysql_query($insert_query);
if(!$insert_result) {
  die('insert query failed' . mysql_error());
}

mysql_close($con);

// PUSHER STUFF
$pusher = new Pusher($key, $secret, $app_id);
$channel_name = 'givecampuk-channel';

$values = array('who' => $who, 'howMuch' => $how_much, 'newTotal' => $running_total);
$pusher->trigger($channel_name, 'new_donation', $values);

$callback = $_GET['callback'];
echo($callback . '( {"result":"success"} );');
?>