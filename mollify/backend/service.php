<?php
	$ERRORS = array(
		"UNAUTHORIZED" => array(100, "Unauthorized request"), 
		"UNSUPPORTED_OPERATION" => array(101, "Unsupported operation"),
		
		"INVALID_PATH" => array(201, "Invalid path"), 
		"FILE_DOES_NOT_EXIST" => array(202, "File does not exist"), 
		"FILE_ALREADY_EXISTS" => array(203, "File already exists"), 
		"NOT_A_FILE" => array(204, "Target is not a file"), 
		"DELETE_FAILED" => array(205, "Could not delete"), 
		"NO_UPLOAD_DATA" => array(206, "No upload data available"), 
		"UPLOAD_FAILED" => array(207, "File upload failed"), 
		"SAVING_FAILED" => array(208, "Saving file failed")
	);
	
	function return_json($result_array) {
		$ext = isset($_GET["callback"]);
		if ($ext) echo $_GET["callback"]."(";
		echo json_encode($result_array);
		if ($ext) echo ');';
	}
	
	function get_success_message() {
		return array("success" => TRUE);
	}
	
	function get_error_message($error, $details = "") {
		$err = $ERRORS[$error];
		if (!$err) {
			return array("success" => FALSE, "code" => 0, "error" => "Unknown error: " + $error, "details" => $details);
		}
		return array("success" => FALSE, "code" => $err[0], "error" => $err[1], "details" => $details);
	}

	if (!isset($_GET["action"])) {
		return;
	}
	
	require "user.php";
	$account = get_account();
	if (!$account) {
		return_json(get_error_message("UNAUTHORIZED"));
		return;
	}
	
	require "files.php";
	$result = FALSE;
	$error = "";
	$error_details = "";
	
	switch ($_GET["action"]) {
		case "get":
			if (!isset($_GET["type"])) {
				return;
			}
			
			switch ($_GET["type"]) {
				case "roots":
					foreach($account["roots"] as $root) {
						$result[] = array(
							"id" => get_file_id($root["path"]),
							"name" => $root["name"]
						);
					}
					break;
				case "files":
					$result = get_files($account);
					break;
				case "dirs":
					$result = get_directories($account);
					break;
			}
			
			break;
		case "operate":
			if (!isset($_GET["type"]) || !isset($_GET["id"])) {
				return;
			}
			$operation = $_GET["type"];
			$id = $_GET["id"];
			$filename = get_filename($id);
			
			switch (strtolower($operation)) {
				case "download":
					// download does not return JSON, it rewrites headers etc
					if (download($filename)) return;
					break;
				
				case "rename":
					if (!isset($_GET["to"]))
						return;
					if (rename_file($filename, urldecode($_GET["to"])))
						$result = get_success_message();
					break;
					
				case "delete":
					if (delete_file($filename))
						$result = get_success_message();
					break;
				
				case "upload":
					$dir = $filename;
					if (upload_file($dir))
						$result = get_success_message();
					header("Content-Type: text/html");
					header("HTTP/1.1 200 OK", true);
					break;

				default:
					$result = get_error_message("UNSUPPORTED_OPERATION", $operation);
					break;
			}
			
			break;
	}

	// return JSON
	if (!$result) {
		$result = get_error_message($error);
	}
	return_json($result);
?>
