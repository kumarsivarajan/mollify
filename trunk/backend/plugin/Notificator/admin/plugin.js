/**
 * plugin.js
 *
 * Copyright 2008- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.mollify.org/license.php
 */
	 
!function($, mollify) {

	"use strict"; // jshint ;_;

	mollify.view.config.admin.Notificator = {
		NotificationsView : function() {
			var that = this;
			this.viewId = "notificator";

			this.init = function(s, cv) {
				that._cv = cv;
				that.title = mollify.ui.texts.get("pluginNotificatorAdminNavTitle");
				
				mollify.service.get("events/types/").done(function(t) {
					that._events = [];
					that._eventTexts = t;
					for (var k in t) {
						if (t[k])
							that._events.push(k);
					}
				});
			}

			this.onActivate = function($c) {
				var list = false;
				var listView = false;
				that._details = mollify.ui.controls.slidePanel($("#mollify-mainview-viewcontent"), { resizable: true });
							
				var updateList = function() {
					that._cv.showLoading(true);
					mollify.service.get("notificator/list/").done(function(l) {
						list = l;
						listView.table.set(list);
						that._cv.showLoading(false);
					});
				};
	
				listView = new mollify.view.ConfigListView($c, {
					actions: [
						{ id: "action-add", content:'<i class="icon-plus"></i>', callback: function() { that.onAddEditNotification(false, updateList); }},
						{ id: "action-remove", content:'<i class="icon-trash"></i>', cls:"btn-danger", depends: "table-selection", callback: function(sel) { mollify.service.del("notificator/list/", { ids: mollify.helpers.extractValue(sel, "id") }).done(updateList); }},
						{ id: "action-refresh", content:'<i class="icon-refresh"></i>', callback: updateList }
					],
					table: {
						id: "plugin-notifications-list",
						key: "id",
						narrow: true,
						hilight: true,
						columns: [
							{ type:"selectrow" },
							{ id: "icon", title:"", type:"static", content: '<i class="icon-envelope-alt"></i>' },
							{ id: "name", title: mollify.ui.texts.get('pluginNotificatorAdminNameTitle') },
							{ id: "id", title: mollify.ui.texts.get('configAdminTableIdTitle') },
							{ id: "edit", title: "", type: "action", content: '<i class="icon-edit"></i>' },
							{ id: "remove", title: "", type: "action", content: '<i class="icon-trash"></i>' }
						],
						onRowAction: function(id, n) {
							if (id == "remove") {
								mollify.service.del("notificator/list/"+n.id).done(updateList);
							} else if (id == "edit") {
								that.onAddEditNotification(n, updateList);
							}
						},
						onHilight: function(n) {
							if (n) {
								that._showNotificationDetails(n, that._details.getContentElement().empty());
								that._details.show(false, 400);
							} else {
								that._details.hide();
							}
						}
					}
				});
				updateList();
				
				$c.addClass("loading");
				var gp = mollify.service.get("configuration/usersgroups").done(function(ug) {
					that._allUsersgroups = ug.users.concat(ug.groups);
					that._usersByKey = mollify.helpers.mapByKey(that._allUsersgroups, "id");
				}).done(function(){$c.removeClass("loading");});
			};
			
			this.onDeactivate = function() {
				that._details.remove();
			};
			
			this._getUsers = function(ids) {
				var result = [];
				$.each(ids, function(i, id) {
					result.push(that._usersByKey[id]);
				});
				return result;
			}
			
			this.onAddEditNotification = function(n, cb) {
				mollify.ui.dialogs.input({
					resizable: true,
					initSize: [600, 400],
					title: mollify.ui.texts.get(n ? 'pluginNotificationAdminEditNotificationTitle' : 'pluginNotificationAdminAddNotificationTitle'),
					message: mollify.ui.texts.get(n ? 'pluginNotificationAdminEditNotificationMessage' : 'pluginNotificationAdminAddNotificationMessage'),
					yesTitle: mollify.ui.texts.get('dialogSave'),
					noTitle: mollify.ui.texts.get('dialogCancel'),
					defaultValue: n ? n.name : "",
					handler: {
						isAcceptable : function(name) {
							if (!name || name.length === 0) return false;
							if (n && name == n.name) return false;
							return true;
						},
						onInput: function(name) {
							if (n)
								mollify.service.put("notificator/list/"+n.id, {name:name}).done(cb);
							else
								mollify.service.post("notificator/list/", {name:name}).done(cb);
						}
					}
				});
			}
			
			this._showNotificationDetails = function(n, $e) {
				mollify.templates.load("plugin-notification-content", mollify.helpers.noncachedUrl(mollify.plugins.adminUrl("Notificator", "content.html"))).done(function() {
					mollify.dom.template("mollify-tmpl-plugin-notificator-notificationdetails", {notification: n}).appendTo($e);
					mollify.ui.process($e, ["localize"]);
					
					var nd = false;
					var $title = $e.find(".mollify-notificator-notificationdetails-messagetitle");
					var $msg = $e.find(".mollify-notificator-notificationdetails-message");
					var $events = $e.find(".mollify-notificator-notificationdetails-events");
					var $eventUsersgroups = $e.find(".mollify-notificator-notificationdetails-eventusersgroups");
					var $usersgroups = $e.find(".mollify-notificator-notificationdetails-usersgroups");
					var eventsView = false;
					var eventUsersgroupsView = false;
					var usersgroupsView = false;
					
					var update = function() {
						$e.addClass("loading");
						mollify.service.get("notificator/list/"+n.id).done(function(r) {
							$e.removeClass("loading");
							nd = r;
							
							$title.text(nd.message_title);
							$msg.text(nd.message);
							eventsView.table.set(nd.events);
							eventUsersgroupsView.table.set(nd.users);
							usersgroupsView.table.set(that._getUsers(nd.recipients));
						});
					};
					var onAddEvents = function() {
						var currentEvents = nd.events;
						var selectable = mollify.helpers.filter(that._events, function(e) { return nd.events.indexOf(e) < 0; });
						if (selectable.length === 0) return;
		
						mollify.ui.dialogs.select({
							title: mollify.ui.texts.get('pluginNotificatorNotificationAddEventTitle'),
							message: mollify.ui.texts.get('pluginNotificatorNotificationAddEventMessage'),
							initSize: [600, 400],
							columns: [
								{ id: "icon", title:"", type:"static", content: '<i class="icon-folder"></i>' },
								{ id: "id", title: mollify.ui.texts.get('configAdminTableIdTitle'), valueMapper: function(i) { return i; } }
							],
							list: selectable,
							onSelect: function(sel, o) {
								var folders = [];
								$.each(sel, function(i, f) {
									var folder = {id: f.id};
									var name = o[f.id] ? o[f.id].user_name : false;
									if (name && f.name != name)
											folder.name = name;
									folders.push(folder);
								});
								mollify.service.put("notificator/list/"+nd.id, {events: sel}).done(update);
							}
						});
					};
					var onAddUsersgroups = function() {
						var selectable = mollify.helpers.filter(that._allUsersgroups, function(f) { return nd.recipients.indexOf(f.id) < 0; });
						if (selectable.length === 0) return;
		
						mollify.ui.dialogs.select({
							title: mollify.ui.texts.get('pluginNotificatorNotificationAddUserTitle'),
							message: mollify.ui.texts.get('pluginNotificatorNotificationAddUserMessage'),
							key: "id",
							initSize: [600, 400],
							columns: [
								{ id: "icon", title:"", valueMapper: function(i, v) { if (i.is_group == 1) return "<i class='icon-user'></i><i class='icon-user'></i>"; return "<i class='icon-user'></i>"; } },
								{ id: "id", title: mollify.ui.texts.get('configAdminTableIdTitle') },
								{ id: "name", title: mollify.ui.texts.get('configAdminUserDialogUsernameTitle') }
							],
							list: selectable,
							onSelect: function(sel, o) {
								mollify.service.put("notificator/list/"+nd.id, {recipients: nd.recipients.concat(mollify.helpers.extractValue(sel, "id"))}).done(update);
							}
						});
					};

					var onAddEventUsersgroups = function() {
						var userIds = mollify.helpers.extractValue(nd.users, "id");
						var selectable = mollify.helpers.filter(that._allUsersgroups, function(f) { return userIds.indexOf(f.id) < 0; });
						if (selectable.length === 0) return;
		
						mollify.ui.dialogs.select({
							title: mollify.ui.texts.get('pluginNotificatorNotificationAddEventUserTitle'),
							message: mollify.ui.texts.get('pluginNotificatorNotificationAddEventUserMessage'),
							key: "id",
							initSize: [600, 400],
							columns: [
								{ id: "icon", title:"", valueMapper: function(i, v) { if (i.is_group == 1) return "<i class='icon-user'></i><i class='icon-user'></i>"; return "<i class='icon-user'></i>"; } },
								{ id: "id", title: mollify.ui.texts.get('configAdminTableIdTitle') },
								{ id: "name", title: mollify.ui.texts.get('configAdminUserDialogUsernameTitle') }
							],
							list: selectable,
							onSelect: function(sel, o) {
								mollify.service.put("notificator/list/"+nd.id, {users: userIds.concat(mollify.helpers.extractValue(sel, "id"))}).done(update);
							}
						});
					};
					
					var onEditFilters = function(event) {
						var availableFilters = [
							{
								events: "^filesystem/.*",
								filters: [
									{ key : "item_parent", type : "folder"},
									{ key : "item_any_parent", type : "folder"},
									{ key : "item_name", type : "string"}
								]
							}
						];
						var filterData = {
							"new": [],
							"modified": [],
							"removed": []
						};
						var $content = false;
						
						var getAvailableFilters = function() {
							var result = [];
							$.each(availableFilters, function(i, f) {
								if (!new RegExp(f.events, "gi").test(event.type)) return;
								result = result.concat(f.filters);
							});
							return result;
						};
						
						var initFilterEditor = function($e, f) {
							if (f.type == "folder") {
								mollify.dom.template("mollify-tmpl-notificator-filtereditor-folder").appendTo($e);
								
								var selected = false;
								var $val = $e.find(".mollify-notificator-filtereditor-folder-value");
								var onSelect = function(f) {
									selected = f;
									$val.val(selected.name);
								};
								$e.find(".mollify-notificator-filtereditor-folder-select").click(function() {
									mollify.ui.dialogs.folderSelector({
										title: mollify.ui.texts.get('pluginNotificatorNotificationEventFilterFolderEditorSelectTitle'),
										message: mollify.ui.texts.get('pluginNotificatorNotificationEventFilterFolderEditorSelectMsg'),
										actionTitle: mollify.ui.texts.get('ok'),
										handler: {
											onSelect: onSelect,
											canSelect: function(f) { return true; }
										}
									});
								});
								
								return {
									hasValue : function() {
										return !!selected;
									},
									getValue : function() {
										return selected ? selected.id : false;
									},
									getVisibleValue : function() {
										return selected ? selected.path : false;
									}
								};
							}
							else if (f.type == "string") {
								mollify.dom.template("mollify-tmpl-notificator-filtereditor-string").appendTo($e);								
								var $val = $e.find(".mollify-notificator-filtereditor-string-value");
								
								return {
									hasValue : function() {
										var val = $val.val();
										return val && val.length > 0;
									},
									getValue : function() {
										return $val.val();
									},
									getVisibleValue : function() {
										return $val.val();
									}
								};
							}
							return false;
						};
						
						mollify.ui.dialogs.custom({
							resizable: true,
							initSize: [600, 400],
							title: mollify.ui.texts.get('pluginNotificatorNotificationEditEventFilters'),
							content: mollify.dom.template("mollify-tmpl-notificator-filtereditor", {event: event}),
							buttons: [
								{ id: "yes", "title": mollify.ui.texts.get('dialogSave') },
								{ id: "no", "title": mollify.ui.texts.get('dialogCancel') }
							],
							"on-button": function(btn, d) {
								if (btn.id == 'no') {
									d.close();
									return;
								}
								if (filterData["new"].length === 0 && filterData.removed.length === 0)
									return;
								
								$content.addClass("loading");
								mollify.service.put("notificator/list/"+nd.id+"/events/"+event.id+"/filters/", filterData).done(d.close).fail(d.close);
							},
							"on-show": function(h, $d) {
								$content = $d.find("#mollify-notificator-filtereditor-content");
								/*$("#mollify-pluginpermissions-editor-change-item").click(function(e) {
									e.preventDefault();
									return false;
								});*/
			
								h.center();
								$content.removeClass("loading");
								
								var $list = mollify.ui.controls.table("mollify-notificator-filtereditor-list", {
									key: "id",
									columns: [
										{ id: "id", title: mollify.ui.texts.get('xx')},
										{ id: "type", title: mollify.ui.texts.get('yy') },
										{ id: "visibleValue", title: mollify.ui.texts.get('zz') },
										{ id: "remove", title: "", type:"action", content: mollify.dom.template("mollify-tmpl-notificator-filtereditor-listremove").html() }
									],
									onRowAction: function(id, f) {
										if (!f.isnew) filterData.new.removed(newFilter);
										$list.remove(f);
									}
								});
								if (e.filters) $list.add(e.filters);
								
								var editor = false;
								var $newType = mollify.ui.controls.select("mollify-notificator-filtereditor-new-type", {
									none: {title: mollify.ui.texts.get('pluginNotificatorNotificationEditEventFiltersSelect')},
									title: "key",
									onChange: function(nf) {
										clearNewEditor();
										if (nf) editor = initFilterEditor($("#mollify-notificator-filtereditor-new-value"), nf);
									}
								});
								$newType.add(getAvailableFilters());
								var clearNewEditor = function() {
									$newType.sel(null);
									$("#mollify-notificator-filtereditor-new-value").empty();
									editor = false;
								};
								
								$("#mollify-notificator-filtereditor-new-add").click(function() {
									var selectedFilter = $newType.selected();
									if (!selectedFilter) return;
									if (!editor || !editor.hasValue()) return;
									
									var newFilter = {type: selectedFilter.key, val: editor.getValue(), visibleValue: editor.getVisibleValue(), isnew: true};
									filterData.new.push(newFilter);
									$list.add(newFilter);
									clearNewEditor();
								});
								/*that.loadPermissions(item, function(permissions, userData) {
									$content.removeClass("loading");
									that.initEditor(item, permissions, userData, permissionData);
								}).fail(h.close);*/
							}
						});
					};
							
					eventsView = new mollify.view.ConfigListView($events, {
						title: mollify.ui.texts.get('pluginNotificatorNotificationEventsTitle'),
						actions: [
							{ id: "action-add", content:'<i class="icon-plus"></i>', callback: onAddEvents },
							{ id: "action-remove", content:'<i class="icon-trash"></i>', cls:"btn-danger", depends: "table-selection", callback: function(sel) {
								mollify.service.del("notificator/list/"+nd.id+"/events/", { ids: mollify.helpers.extractValue(sel, "id") }).done(update);
							}}
						],
						table: {
							id: "plugin-notificator-notificationevents",
							narrow: true,
							columns: [
								{ type:"selectrow" },
								{ id: "icon", title:"", type:"static", content: '<i class="icon-folder"></i>' },
								{ id: "type", title: mollify.ui.texts.get('pluginNotificatorAdminEventTypeTitle') },
								{ id: "filter", title: mollify.ui.texts.get('pluginNotificatorAdminEventFilterTitle'), valueMapper: function(i, v) { return i.filters ? i.filters.length : ""; } },
								{ id: "set_filter", title: "", type: "action", content: '<i class="icon-filter"></i>' },
								{ id: "remove", title: mollify.ui.texts.get('configAdminActionRemoveTitle'), type: "action", content: '<i class="icon-trash"></i>' }
							],
							onRowAction: function(id, e) {
								if (id == "remove") {
									mollify.service.del("notificator/list/"+nd.id+"/events/", { ids: [e.id] }).done(update);
								} else if (id == "set_filter") {
									onEditFilters(e);
								}
							}
						}
					});

					eventUsersgroupsView = new mollify.view.ConfigListView($eventUsersgroups, {
						title: mollify.ui.texts.get('pluginNotificatorNotificationEventUsersTitle'),
						actions: [
							{ id: "action-add", content:'<i class="icon-plus"></i>', callback: onAddEventUsersgroups },
							{ id: "action-remove", content:'<i class="icon-trash"></i>', cls:"btn-danger", depends: "table-selection", callback: function(sel) {
								mollify.service.del("notificator/list/"+nd.id+"/users/", { ids: mollify.helpers.extractValue(sel, "id") }).done(update);
							}}
						],
						table: {
							id: "plugin-notificator-notificationeventusers",
							key: "id",
							narrow: true,
							emptyHint: mollify.ui.texts.get('pluginNotificatorNotificationNoEventUsersMsg'),
							columns: [
								{ type:"selectrow" },
								{ id: "icon", title:"", valueMapper: function(i, v) { if (i.is_group == 1) return "<i class='icon-user'></i><i class='icon-user'></i>"; return "<i class='icon-user'></i>"; } },
								{ id: "id", title: mollify.ui.texts.get('configAdminTableIdTitle') },
								{ id: "name", title: mollify.ui.texts.get('configAdminUserDialogUsernameTitle') },
								{ id: "remove", title: "", type: "action", content: '<i class="icon-trash"></i>' }
							],
							onRowAction: function(id, g) {
								if (id == "remove") {
									mollify.service.del("notificator/list/"+nd.id+"/users/", { ids: [g.id] }).done(update);
								}
							}
						}
					});
							
					usersgroupsView = new mollify.view.ConfigListView($usersgroups, {
						title: mollify.ui.texts.get('pluginNotificatorNotificationUsersTitle'),
						actions: [
							{ id: "action-add", content:'<i class="icon-plus"></i>', callback: onAddUsersgroups },
							{ id: "action-remove", content:'<i class="icon-trash"></i>', cls:"btn-danger", depends: "table-selection", callback: function(sel) {
								mollify.service.del("notificator/list/"+nd.id+"/recipients/", { ids: mollify.helpers.extractValue(sel, "id") }).done(update);
							}}
						],
						table: {
							id: "plugin-notificator-notificationusers",
							key: "id",
							narrow: true,
							columns: [
								{ type:"selectrow" },
								{ id: "icon", title:"", valueMapper: function(i, v) { if (i.is_group == 1) return "<i class='icon-user'></i><i class='icon-user'></i>"; return "<i class='icon-user'></i>"; } },
								{ id: "id", title: mollify.ui.texts.get('configAdminTableIdTitle') },
								{ id: "name", title: mollify.ui.texts.get('configAdminUserDialogUsernameTitle') },
								{ id: "remove", title: "", type: "action", content: '<i class="icon-trash"></i>' }
							],
							onRowAction: function(id, r) {
								if (id == "remove") {
									mollify.service.del("notificator/list/"+nd.id+"/recipients/", { ids: [r.id] }).done(update);
								}
							}
						}
					});
					$(".mollify-notificator-notificationdetails-editmessage").click(function() { that.onEditMessage(nd, update); } );
					
					update();
				});
			}

			this.onEditMessage = function(n, cb) {
				var $content = false;
				var $title = false;
				var $message = false;
				
				mollify.ui.dialogs.custom({
					resizable: true,
					initSize: [600, 400],
					title: mollify.ui.texts.get('pluginNotificatorNotificationEditMessageDialogTitle'),
					content: mollify.dom.template("mollify-tmpl-notificator-editmessage", {notification: n}),
					buttons: [
						{ id: "yes", "title": mollify.ui.texts.get('dialogSave') },
						{ id: "no", "title": mollify.ui.texts.get('dialogCancel') }
					],
					"on-button": function(btn, d) {
						if (btn.id == 'no') {
							d.close();
							return;
						}
						mollify.service.put("notificator/list/"+n.id, {message_title: $title.val(), message: $message.val()}).done(d.close).done(cb);
					},
					"on-show": function(h, $d) {
						$content = $d.find("#mollify-notificator-editmessage-dialog");
						$title = $d.find("#titleField");
						$message = $d.find("#messageField");
						
						$title.val(n.message_title);
						$message.val(n.message);
						
						$title.focus();
	
						h.center();
					}
				});
			}	
		}
	}

	mollify.admin.plugins.Notificator = {
		resources : {
			texts: true
		},
		views: [
			new mollify.view.config.admin.Notificator.NotificationsView()
		]
	};
}(window.jQuery, window.mollify);
