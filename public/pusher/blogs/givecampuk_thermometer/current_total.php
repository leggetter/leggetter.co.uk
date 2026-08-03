<?php
require('config.php');

header('Content-Type: text/javascript');

$con = mysql_connect("localhost", $db_username, $db_password);
if (!$con)
{
  die('Could not connect: ' . mysql_error());
}

mysql_select_db($db_name, $con);

$running_total = 0;
$last_update = "SELECT * FROM $db_tablename ORDER BY id DESC LIMIT 1";
$result = mysql_query($last_update);
if(!$result) {
  die('could not get total');
}
$row = mysql_fetch_array($result);
$running_total = $row['running_total'];

echo ($_GET['callback'] . '(' . $running_total . ');');
?>