<?php
	class FileConfigurationProvider extends ConfigurationProvider {
		private $permissionDao;
		
		public function __construct($settings) {
			require_once("file/FilePermissionDao.class.php");
			require_once("file/FileDescriptionDao.class.php");
			
			$this->permissionDao = new FilePermissionDao($settings->setting("permission_file"));
			$this->descriptionDao = new FileDescriptionDao($settings->setting("description_file"));
		}
		
		function getSupportedFeatures() {
			$features = array('description_update');
			if ($this->isAuthenticationRequired()) $features[] = 'permission_update';
			return $features;
		}
		
		function findUser($username, $password) {
			global $USERS, $PASSWORDS_HASHED;
				
			foreach($USERS as $id => $user) {
				if ($user["name"] != $username)
					continue;
					
				$pw = $user["password"];
				if (!isset($PASSWORDS_HASHED) or $PASSWORDS_HASHED != TRUE) {
					$pw = md5($pw);
				}
	
				if ($pw != $password) {
					Logging::logError("Invalid password for user [".$user["name"]."]");
					return NULL;
				}
				
				return array("id" => $id, "name" => $user["name"]);
			}
			
			Logging::logError("No user found with name [".$username."]");
			return NULL;
		}
		
		function getAllUsers() {
			global $USERS;
			$result = array();
			foreach($USERS as $id => $user)
				$result[] = array("id" => "".$id, "name" => $user["name"], "permission_mode" => $user["file_permission_mode"]);
			return $result;
		}

		function getUser($id) {
			if ($id === "") return FALSE;
			global $USERS;
			return $USERS[$id];
		}
		
		function getDefaultPermission($userId = "") {
			global $USERS, $FILE_PERMISSION_MODE;
			
			if ($userId === "") {
				if (!isset($FILE_PERMISSION_MODE)) return Authentication::$PERMISSION_VALUE_READONLY;
				$mode = strtoupper($FILE_PERMISSION_MODE);
			} else {
				if (!isset($USERS[$userId]["file_permission_mode"])) return Authentication::$PERMISSION_VALUE_READONLY;
				$mode = strtoupper($USERS[$userId]["file_permission_mode"]);
			}

			$this->env->authentication()->assertPermissionValue($mode);	
			return $mode;
		}
	
		function isAuthenticationRequired() {
			global $USERS;
			return ($USERS != FALSE and count($USERS) > 0);
		}
		
		public function getUserFolders($userId) {
			global $USERS, $PUBLISHED_DIRECTORIES;
	
			if (!isset($PUBLISHED_DIRECTORIES)) return array();
			
			if (count($USERS) === 0) {
				return $PUBLISHED_DIRECTORIES;
			} else {
				if (!array_key_exists($userId, $PUBLISHED_DIRECTORIES)) throw new ServiceException("INVALID_CONFIGURATION", "Missing root directory configuration for user ".$userId);
				return $PUBLISHED_DIRECTORIES[$userId];
			}
		}
		
		public function getItemDescription($item) {
			return $this->descriptionDao->getItemDescription($item);
		}
				
		public function setItemDescription($item, $description) {
			return $this->descriptionDao->setItemDescription($item, $description);
		}
	
		public function removeItemDescription($item) {
			if (!$item->isFile()) return;
			return $this->descriptionDao->removeItemDescription($item);
		}
		
		public function moveItemDescription($from, $to) {
			if (!$from->isFile()) return;
			return $this->descriptionDao->moveItemDescription($from, $to);
		}
		
		public function getItemPermission($item, $userId) {
			return $this->permissionDao->getItemPermission($item, $userId);
		}

		public function getItemPermissions($item) {
			return $this->permissionDao->getItemPermissions($item);
		}

		public function moveItemPermissions($from, $to) {
			if (!$from->isFile()) return;
			return $this->permissionDao->moveItemPermissions($from, $to);
		}
		
		public function updateItemPermissions($updates) {
			// find item id (assumes that all are for the same item)
			$id = NULL;
			$new = $updates['new'];
			$modified = $updates['modified'];
			$removed = $updates['removed'];
			
			if (count($new) > 0) $id = $new[0]["item_id"];
			else if (count($modified) > 0) $id = $modified[0]["item_id"];
			else if (count($removed) > 0) $id = $removed[0]["item_id"];
			else return TRUE;

			$this->permissionDao->updateItemPermissions($this->env->filesystem()->getItemFromId($id), $new, $modified, $removed);
		}
		
		public function removeItemPermissions($item) {
			if (!$item->isFile()) return;
			return $this->permissionDao->removeItemPermissions($item);
		}

	}
?>