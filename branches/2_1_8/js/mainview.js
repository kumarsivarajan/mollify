/**
 * mainview.js
 *
 * Copyright 2008- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.mollify.org/license.php
 */
 
!function($, mollify) {

	"use strict"; // jshint ;_;
	
	mollify.view.MainView = function() {
		var that = this;
		this._mainFileView = false;
		this._mainConfigView = false;
		this._views = [];
		this._currentView = false;
		
		this.init = function($c) {
			that._mainFileView = new mollify.view.MainViewFileView();
			that._mainConfigView = new mollify.view.MainViewConfigView();
			that._views = [ this._mainFileView, this._mainConfigView ];

			$.each(mollify.plugins.getMainViewPlugins(), function(i, p) {
				if (!p.mainViewHandler) return;
				var view = p.mainViewHandler();
				that._views.push(view);
			});
			
			that.itemContext = new mollify.ui.itemContext();
			mollify.dom.loadContentInto($c, mollify.templates.url("mainview.html"), that, ['localize']);			
		}
		
		this.onLoad = function() {
			$(window).resize(that.onResize);
			that.onResize();

			mollify.dom.template("mollify-tmpl-main-username", mollify.session).appendTo("#mollify-mainview-user");
			if (mollify.session.authenticated) {
				mollify.ui.controls.dropdown({
					element: $('#mollify-username-dropdown'),
					items: that.getSessionActions()
				});
			}
			
			var menuitems = [];
			$.each(that._views, function(i, v) {
				v.init(that);
				menuitems.push({ icon: v.icon, title: v.title });
			});
			
			var $mb = $("#mollify-mainview-menu");
			var $mbitems = mollify.dom.template("mollify-tmpl-main-menubar", menuitems).appendTo($mb);
			//var $mbitems = $mb.find(".mollify-mainview-menubar-item");
			$mbitems.click(function() {
				var i = $mbitems.index($(this));
				that.activateView(that._views[i]);
			});
			
			if (that._views.length > 0)
				that.activateView(that._views[0]);
		}
		
		this.activateView = function(v) {			
			mollify.ui.hideActivePopup();
			if (that._currentView && that._currentView.onDeactivate) that._currentView.onDeactivate();
			$("#mollify-mainview-navlist-parent").empty();

			that._currentView = v;
			
			$("#mollify-mainview-navbar").empty();
			v.onActivate({
				content: $("#mollify-mainview-viewcontent").empty(),
				tools: $("#mollify-mainview-viewtools").empty(),
				addNavBar: that.addNavBar,
				mainview: that,
				fileview: that._mainFileView
			});
			var $mnu = $("#mollify-mainview-menu");
			var $items = $mnu.find(".mollify-mainview-menubar-item").removeClass("active");
			var i = that._views.indexOf(v);
			$($items.get(i)).addClass("active");			
		};
		
		this.onNotification = function(spec) {
			var $trg = (spec && spec.target) ? ((typeof spec.target === 'string') ? $("#"+spec.target) : spec.target) : $("#mollify-mainview-content");
			var $ntf = mollify.dom.template("mollify-tmpl-main-notification", spec).hide().appendTo($trg).fadeIn(300);
			setTimeout(function() {
				$ntf.fadeOut(300);
				setTimeout($ntf.remove, 300);
				if (spec["on-finish"]) spec["on-finish"]();
			}, spec.time | 3000);

			return true;
		};
		
		this.getActiveView = function() {
			return that._currentView;
		};
		
		this.addNavBar = function(nb) {
			var $nb = mollify.dom.template("mollify-tmpl-main-navbar", nb).appendTo($("#mollify-mainview-navlist-parent"));
			var items = nb.items;
			var initItems = function() {
				var $items = $nb.find(".mollify-mainview-navbar-item");
				if (nb.classes) $items.addClass(nb.classes);
				if (nb.dropdown) {
					$items.each(function(i, e) {
						var item = items[$items.index(this)];
						var $tr = $('<li class="mollify-mainview-navbar-dropdown"><a href="#" class="dropdown-toggle"><i class="icon-cog"></i></a></li>').appendTo($(e));
						var dropdownItems = [];
						if (typeof(nb.dropdown.items) != 'function') dropdownItems = nb.dropdown.items;
						mollify.ui.controls.dropdown({
							element: $tr,
							items: dropdownItems,
							onShow: function(api, menuItems) {
								if (menuItems.length > 0) return;
								if (typeof(nb.dropdown.items) == 'function') {
									api.items(nb.dropdown.items(item.obj));
								}
							}
						});
					});
				}
				$items.click(function() {
					var item = items[$items.index(this)];
					if (item.callback) item.callback();
				});
				if (nb.onRender) nb.onRender($nb, $items, function($e) { return items[$items.index($e)].obj; });
			};
			initItems();
			return {
				element: $nb,
				setActive : function(o) {
					var $items = $nb.find(".mollify-mainview-navbar-item");
					$items.removeClass("active");
					if (!o) return;
					$.each($items, function(i, itm) {
						var obj = items[i].obj;
						if (!obj) return;

						var match = window.def(o.id) ? o.id == obj.id : o == obj;
						if (match) {
							$(itm).addClass("active");
							return false;
						}
					});
				},
				update : function(l) {
					items = l;
					$nb.find(".mollify-mainview-navbar-item").remove();
					mollify.dom.template("mollify-tmpl-main-navbar-item", items).appendTo($nb);
					initItems();
				}
			};
		}
		
		this.onResize = function() {
			if (that._currentView) that._currentView.onResize();
		}
		
		this.getSessionActions = function() {
			var actions = [];		
			if (mollify.features.hasFeature('change_password')) {
				actions.push({"title-key" : "mainViewChangePasswordTitle", callback: that.changePassword});
				actions.push({"title" : "-"});
			}
			actions.push({"title-key" : "mainViewLogoutTitle", callback: that.onLogout});
			return actions;
		}
		
		this.onLogout = function() {
			mollify.service.post("session/logout").done(function(s) {
				mollify.events.dispatch('session/end');
			});
		}
		
		this.changePassword = function() {	
			var $dlg = false;
			var $old = false;
			var $new1 = false;
			var $new2 = false;
			var errorTextMissing = mollify.ui.texts.get('mainviewChangePasswordErrorValueMissing');
			var errorConfirm = mollify.ui.texts.get('mainviewChangePasswordErrorConfirm');

			var doChangePassword = function(oldPw, newPw, successCb) {
				mollify.service.put("configuration/users/current/password/", {old:window.Base64.encode(oldPw), "new": window.Base64.encode(newPw) }).done(function(r) {
					successCb();
					mollify.ui.dialogs.notification({message:mollify.ui.texts.get('mainviewChangePasswordSuccess')});
				}).fail(function(e) {
					this.handled = true;
					if (e.code == 107) {
						mollify.ui.dialogs.notification({message:mollify.ui.texts.get('mainviewChangePasswordError'), type: 'error', cls: 'full', target: $dlg.find(".modal-footer")});
					} else this.handled = false;
				});
			}
			
			mollify.ui.dialogs.custom({
				title: mollify.ui.texts.get('mainviewChangePasswordTitle'),
				content: $("#mollify-tmpl-main-changepassword").tmpl({message: mollify.ui.texts.get('mainviewChangePasswordMessage')}),
				buttons: [
					{ id: "yes", "title": mollify.ui.texts.get('mainviewChangePasswordAction') },
					{ id: "no", "title": mollify.ui.texts.get('dialogCancel') }
				],
				"on-button": function(btn, d) {
					var old = false;
					var new1 = false;
					var new2 = false;
					
					if (btn.id === 'yes') {
						$dlg.find(".control-group").removeClass("error");
						$dlg.find(".help-inline").text("");
						
						// check
						old = $old.find("input").val();
						new1 = $new1.find("input").val();
						new2 = $new2.find("input").val();
						
						if (!old) {
							$old.addClass("error");
							$old.find(".help-inline").text(errorTextMissing);
						}
						if (!new1) {
							$new1.addClass("error");
							$new1.find(".help-inline").text(errorTextMissing);
						}
						if (!new2) {
							$new2.addClass("error");
							$new2.find(".help-inline").text(errorTextMissing);
						}
						if (new1 && new2 && new1 != new2) {
							$new1.addClass("error");
							$new2.addClass("error");
							$new1.find(".help-inline").text(errorConfirm);
							$new2.find(".help-inline").text(errorConfirm);
						}
						if (!old || !new1 || !new2 || new1 != new2) return;
					}

					if (btn.id === 'yes') doChangePassword(old, new1, d.close);
					else d.close();
				},
				"on-show": function(h, $d) {
					$dlg = $d;
					$old = $("#mollify-mainview-changepassword-old");
					$new1 = $("#mollify-mainview-changepassword-new1");
					$new2 = $("#mollify-mainview-changepassword-new2");
					
					$old.find("input").focus();
				}
			});
		}
	}
	
	mollify.view.MainViewFileView = function() {
		var that = this;
		this._currentFolder = false;
		this._currentFolderInfo = false;
		this._viewStyle = 0;
		this._selected = [];
		this._customFolderTypes = {};
		this._formatters = {
			byteSize : new mollify.ui.formatters.ByteSize(new mollify.ui.formatters.Number(2, false, mollify.ui.texts.get('decimalSeparator'))),
			timestamp : new mollify.ui.formatters.Timestamp(mollify.ui.texts.get('shortDateTimeFormat')),
			uploadSpeed : new mollify.ui.formatters.Number(1, mollify.ui.texts.get('dataRateKbps'), mollify.ui.texts.get('decimalSeparator'))
		};
		
		this._filelist = {
			columns : [],
			addColumn : function(c) {
				that._filelist.columns[c.id] = c;
			}
		};
		
		// spec
		this._filelist.addColumn({
			"id": "name",
			"title-key": "fileListColumnTitleName",
			"sort": function(i1, i2, sort, data) {
				return i1.name.toLowerCase().localeCompare(i2.name.toLowerCase()) * sort;
			},
			"content": function(item, data) {
				return item.name;
			}
		});
		this._filelist.addColumn({
			"id": "path",
			"title-key": "fileListColumnTitlePath",
			"sort": function(i1, i2, sort, data) {
				var p1 = mollify.filesystem.rootsById[i1.root_id].name + i1.path;
				var p2 = mollify.filesystem.rootsById[i2.root_id].name + i2.path;
				return p1.toLowerCase().localeCompare(p2.toLowerCase()) * sort;
			},
			"content": function(item, data) {
				return '<span class="item-path-root">'+mollify.filesystem.rootsById[item.root_id].name + '</span>: <span class="item-path-val">' + item.path + '</span>';
			}
		});
		this._filelist.addColumn({
			"id": "type",
			"title-key": "fileListColumnTitleType",
			"sort": function(i1, i2, sort, data) {
				var e1 = i1.is_file ? i1.extension : '';
				var e2 = i2.is_file ? i1.extension : '';
				return e1.toLowerCase().localeCompare(e2.toLowerCase()) * sort;
			},
			"content": function(item, data) {
				return item.is_file ? item.extension : '';
			}
		});
		this._filelist.addColumn({
			"id": "size",
			"title-key": "fileListColumnTitleSize",
			"min-width": 75,
			"sort": function(i1, i2, sort, data) {
				var s1 = (i1.is_file ? parseInt(i1.size, 10) : 0);
				var s2 = (i2.is_file ? parseInt(i2.size, 10) : 0);
				return (s1-s2) * sort;
			},
			"content": function(item, data) {
				return item.is_file ? that._formatters.byteSize.format(item.size) : '';
			}
		});
		this._filelist.addColumn({
			"id": "file-modified",
			"request-id": "core-file-modified",
			"title-key": "fileListColumnTitleLastModified",
			"width": 180,
			"sort": function(i1, i2, sort, data) {
				if (!i1.is_file && !i2.is_file) return 0;
				if (!data || !data["core-file-modified"]) return 0;
				
				var ts1 = data["core-file-modified"][i1.id] ? data["core-file-modified"][i1.id] * 1 : 0;
				var ts2 = data["core-file-modified"][i2.id] ? data["core-file-modified"][i2.id] * 1 : 0;
				return ((ts1 > ts2) ? 1 : -1) * sort;
			},
			"content": function(item, data) {
				if (!item.id || !item.is_file || !data || !data["core-file-modified"] || !data["core-file-modified"][item.id]) return "";
				return that._formatters.timestamp.format(mollify.helpers.parseInternalTime(data["core-file-modified"][item.id]));
			}
		});
		this._filelist.addColumn({
			"id": "item-description",
			"request-id": "core-item-description",
			"title-key": "fileListColumnTitleDescription",
			"sort": function(i1, i2, sort, data) {
				if (!i1.is_file && !i2.is_file) return 0;
				if (!data || !data["core-item-description"]) return 0;
				
				var d1 = data["core-item-description"][i1.id] ? data["core-item-description"][i1.id] : '';
				var d2 = data["core-item-description"][i2.id] ? data["core-item-description"][i2.id] : '';
				return ((d1 > d2) ? 1 : -1) * sort;
			},
			"content": function(item, data) {
				if (!item.id || !data || !data["core-item-description"] || !data["core-item-description"][item.id]) return "";
				var desc = data["core-item-description"][item.id];
				var stripped = desc.replace(/<\/?[^>]+(>|$)/g, '');
				return '<div class="item-description-container" title="'+stripped+'">'+desc+'</div>';
			}
		});
		this._filelist.addColumn({
			"id": "go-into-folder",
			"title": "",
			"width": 25,
			"sort": function(i1, i2, sort, data) {
				return 0;
			},
			"content": function(item, data) {
				if (item.is_file) return "";
				return '<div class="go-into-folder"><i class="icon-level-down"></i></div>';
			},
			"on-init": function(list) {
				list.$i.delegate(".go-into-folder", "click", function(e) {
					var item = list.getItemForElement($(this));
					if (!item || item.is_file) return;
					that.changeToFolder(item);
					return false;
				});
			}
		});
		
		this.init = function(mainview) {
			that.title = mollify.ui.texts.get('mainviewMenuTitle');
			that.icon = "icon-file-alt";

			mollify.events.addEventHandler(that.onEvent);
			
			that.addCustomFolderType("search", {
				getFolderInfo : function(f) {
					var df = $.Deferred();
					mollify.service.post("filesystem/search", {text:f.value, rq_data: that.getDataRequest()}).done(function(r) {
                        var items = [];
                        for (var id in r.matches) {
                            items.push(r.matches[id].item);
                        }
						df.resolve({items: items, data: r.data, info: r});
					});
					return df.promise();
				},
		
				onRenderFolderView : function(f, fi, $h, $tb) {
					mollify.dom.template("mollify-tmpl-main-searchresults", { folder: f, info: fi }).appendTo($h);
					$("#mollify-searchresults-title-text").text(mollify.ui.texts.get('mainViewSearchResultsTitle', [""+fi.info.count]));
					$("#mollify-searchresults-desc-text").text(mollify.ui.texts.get('mainViewSearchResultsDesc', [f.value]));
					
					var $fa = $("#mollify-fileview-folder-actions");
					that.addCommonFileviewActions($fa);
				},
				
				onItemListRendered : function(f, fi, items) {
					// tooltips
					var matchList = function(l) {
						var r = "";
						var first = true;
						$.each(l, function(i, li) {
							if (!first) r = r + ", ";
							r = r + li.type;
							first = false;
						});
						return r;
					};
					var matchesTitle = mollify.ui.texts.get('mainViewSearchResultTooltipMatches');
					$(".mollify-filelist-item").each(function() {
						var $i = $(this);
						var item = $i.tmplItem().data;
						var title = mollify.filesystem.rootsById[item.root_id].name + '/' + item.path + ', ' + matchesTitle + matchList(fi.info.matches[item.id].matches);

						$i.tooltip({
							placement: "bottom",
							title: title,
							trigger: "hover"
						});
					});
				}
			});
			
			$.each(mollify.plugins.getFileViewPlugins(), function(i, p) {
				if (p.fileViewHandler.onInit) p.fileViewHandler.onInit(that);
				
				if (!p.fileViewHandler.filelistColumns) return;
				var cols = p.fileViewHandler.filelistColumns();
				if (!cols) return;
				
				for (var j=0;j<cols.length;j++)
					that._filelist.addColumn(cols[j]);
			});
			
			that.itemContext = new mollify.ui.itemContext();
		}

		this.addCustomFolderType = function(id, h) {
			this._customFolderTypes[id] = h;
		}
		
		this.onResize = function() {
			//$("#mollify-folderview").height($("#mollify-mainview-content").height());
		}
		
		this.onActivate = function(h) {
			mollify.dom.template("mollify-tmpl-fileview").appendTo(h.content);
			// TODO default view mode
			// TODO expose file urls
			
			var navBarItems = [];
			$.each(mollify.session.folders, function(i, f) {
				navBarItems.push({title:f.name, obj: f, callback:function(){ that.changeToFolder(f); }})
			});
			that.rootNav = h.addNavBar({
				title: mollify.ui.texts.get("mainViewRootsTitle"),
				items: navBarItems,
				onRender: mollify.ui.draganddrop ? function($nb, $items, objs) {
					mollify.ui.draganddrop.enableDrop($items, {
						canDrop : function($e, e, obj) {
							if (!obj || obj.type != 'filesystemitem') return false;
							var item = obj.payload;
							var me = objs($e);
							return that.canDragAndDrop(me, item);
						},
						dropType : function($e, e, obj) {
							if (!obj || obj.type != 'filesystemitem') return false;
							var item = obj.payload;
							var me = objs($e);
							return that.dropType(me, item);
						},
						onDrop : function($e, e, obj) {
							if (!obj || obj.type != 'filesystemitem') return;
							var item = obj.payload;
							var me = objs($e);							
							that.onDragAndDrop(me, item);
						}
					});
				} : false
			});
			
			that.initViewTools(h.tools);
			that.initList();
			
			that.uploadProgress = new UploadProgress($("#mollify-mainview-progress"));
			that._dndUploader = false;
			
			if (mollify.ui.uploader && mollify.ui.uploader.initDragAndDropUploader) {
				that._dndUploader = mollify.ui.uploader.initDragAndDropUploader({
					container: mollify.App.getElement(),
					dropElement: $("#mollify-folderview"),
					handler: that._getUploadHandler()
				});
			}
			
			that._scrollOutThreshold = 100000;
			that._scrollInThreshold = 0;
			$(window).bind('scroll', that._updateScroll);
			
			$.each(mollify.plugins.getFileViewPlugins(), function(i, p) {
				if (p.fileViewHandler.onActivate)
					p.fileViewHandler.onActivate($("#mollify"), h);
			});
			
			if (mollify.filesystem.roots.length === 0) that.showNoRoots();
			else {
				var params = mollify.request.getParams();
				if (params.id) {
					mollify.filesystem.folderInfo({id: params.id}, that.getDataRequest()).done(that._updateFolder).fail(function() {
						//this.handled = true;	//TODO show better error
						that.hideProgress();
						that.openInitialFolder();
					});
				} else if (params.path) {
					mollify.filesystem.findFolder({path: params.path}, that.getDataRequest()).done(that._updateFolder).fail(function(e) {
						if (e.code == 203) {
							mollify.ui.dialogs.error({ message: mollify.ui.texts.get('mainviewFolderNotFound', params.path) });
							this.handled = true;
						}
						that.hideProgress();
						that.openInitialFolder();
					});
				} else that.openInitialFolder();
			}
			
			that.onResize();
		}
		
		this._getUploadHandler = function(c) {
			return {
				start: function(files, ready) {
					that.uploadProgress.show(mollify.ui.texts.get(files.length > 1 ? "mainviewUploadProgressManyMessage" : "mainviewUploadProgressOneMessage", files.length), function() {
						ready();
						//if (c) c.hide(false);
					});
				},
				progress: function(pr, br) {
					var speed = "";
					if (br) speed = that._formatters.uploadSpeed.format(br/1024);
					that.uploadProgress.set(pr, speed);
				},
				finished: function() {
					if (c) c.close();
					that.uploadProgress.hide();
					mollify.ui.dialogs.notification({message:mollify.ui.texts.get('mainviewFileUploadComplete'), type: "success"});
					that.refresh();
				},
				failed: function() {
					if (c) c.close();
					that.uploadProgress.hide();
					mollify.ui.dialogs.notification({message:mollify.ui.texts.get('mainviewFileUploadFailed'), type: "error"});
				}
			};
		};
		/*
					start: function(files, ready) {
						that.uploadProgress.show(mollify.ui.texts.get(files.length > 1 ? "mainviewUploadProgressManyMessage" : "mainviewUploadProgressOneMessage", files.length), ready);
					},
					progress: function(pr) {
						that.uploadProgress.set(pr);
					},
					finished: function() {
						that.uploadProgress.hide();
						mollify.ui.dialogs.notification({message:mollify.ui.texts.get('mainviewFileUploadComplete'), type: "success"});
						that.refresh();
					},
					failed: function() {
						that.uploadProgress.hide();
						mollify.ui.dialogs.notification({message:mollify.ui.texts.get('mainviewFileUploadFailed'), type: "error"});
					}*/
		
		this._updateScroll = function() {
			var s = $(window).scrollTop();			
			var $e = $("#mollify-folderview");
			
			var isDetached = $e.hasClass("detached");
			var toggle = (!isDetached && s > that._scrollOutThreshold) || (isDetached && s < that._scrollInThreshold);
			if (!toggle) return;
			
			if (!isDetached) $("#mollify-folderview").addClass("detached");
			else $("#mollify-folderview").removeClass("detached");
		};
		
		this.openInitialFolder = function() {
			if (mollify.filesystem.roots.length === 0) that.showNoRoots();
			else if (mollify.filesystem.roots.length == 1) that.changeToFolder(mollify.filesystem.roots[0]);
			else that.changeToFolder(null);
		};
		
		this.onDeactivate = function() {
			$(window).unbind('scroll');
			
			if (that._dndUploader) that._dndUploader.destroy();
			
			$.each(mollify.plugins.getFileViewPlugins(), function(i, p) {
				if (p.fileViewHandler.onDeactivate)
					p.fileViewHandler.onDeactivate();
			});
		};
		
		this.initViewTools = function($t) {
			mollify.dom.template("mollify-tmpl-fileview-tools").appendTo($t);
			
			mollify.ui.process($t, ["radio"], that);
			that.controls["mollify-fileview-style-options"].set(that._viewStyle);
			
			var onSearch = function() {
				var val = $("#mollify-fileview-search-input").val();
				if (!val || val.length === 0) return;
				$("#mollify-fileview-search-input").val("");
				that.changeToFolder({ type: "search", value: val });
			};
			$("#mollify-fileview-search-input").keyup(function(e){
				if (e.which == 13) onSearch();
			});
			$("#mollify-fileview-search > button").click(onSearch);
		};
				
		this.getDataRequest = function() {
			var rq = that._currentFolder && !that._currentFolder.type ? {'core-parent-description': {}} : {};
			return $.extend(rq, that.itemWidget.getDataRequest ? that.itemWidget.getDataRequest() : {});
		};
		
		this.getCurrentFolder = function() {
			return that._currentFolder;
		};
		
		this.onEvent = function(e) {
			if (!e.type.startsWith('filesystem/')) return;
			//var files = e.payload.items;
			//TODO check if affects this view
			that.refresh();
		};
				
		this.onRadioChanged = function(groupId, valueId, i) {
			if (groupId == "mollify-fileview-style-options") that.onViewStyleChanged(valueId, i);
		};
		
		this.onViewStyleChanged = function(id, i) {
			that._viewStyle = i;
			that.initList();
			that.refresh();
		};
	
		this.showNoRoots = function() {
			that._currentFolder = false;
			that._currentFolderInfo = {items: mollify.filesystem.roots};
			that.folder();
			that.data();
		};
			
		this.showProgress = function() {
			$("#mollify-folderview-items").addClass("loading");
		};
	
		this.hideProgress = function() {
			$("#mollify-folderview-items").removeClass("loading");
		};
	
		this.changeToFolder = function(f) {
			if (that._currentFolder && that._currentFolder.type && that._customFolderTypes[that._currentFolder.type]) {
				if (that._customFolderTypes[that._currentFolder.type].onFolderDeselect)
					that._customFolderTypes[that._currentFolder.type].onFolderDeselect(that._currentFolder);
			}
			window.scrollTo(0, 0);
			that._selectedItems = [];
			that._currentFolder = f;
			that._currentFolderInfo = false;
			that.rootNav.setActive(false);			
			that.refresh();
		}
		
		this.refresh = function() {
			mollify.ui.hideActivePopup();
			that.showProgress();

			if (that._currentFolder && that._currentFolder.type) {
				if (that._customFolderTypes[that._currentFolder.type]) {
					that._customFolderTypes[that._currentFolder.type].getFolderInfo(that._currentFolder).done(function(r) {
						that._currentFolderInfo = r;
						that.folder();
						that.data();
					}).fail(function() {
						that.hideProgress();
					});
				}
				return;
			}
			
			mollify.filesystem.folderInfo(that._currentFolder, true, that.getDataRequest()).done(that._updateFolder).fail(function() {
				that.hideProgress();
			});
		};
		
		this._updateFolder = function(r) {
			that._currentFolder = r.folder;
			that._currentFolderInfo = r;
			that._currentFolderInfo.items = r.folders.slice(0).concat(r.files);
			
			that.hideProgress();
			that.folder();
			that.data();
		};
		
		this._canWrite = function() {
			if (!that._currentFolderInfo) return false;
			return (that._currentFolderInfo.permission == 'RW');
		}
		
		this.onRetrieveUrl = function(url) {
			if (!that._currentFolder) return;
			
			that.showProgress();
			mollify.service.post("filesystem/"+that._currentFolder.id+"/retrieve", {url:url}).done(function(r) {
				that.hideProgress();
				that.refresh();
			}).fail(function(error) {
				that.hideProgress();
				//301 resource not found
				if (error.code == 301) {
					this.handled = true;
					mollify.ui.views.dialogs.error({
						message: mollify.ui.texts.get('mainviewRetrieveFileResourceNotFound', [url])
					});
				}
			});
		};

		this.dropType = function(to, i) {
			var single = false;	
			if (!window.isArray(i)) single = i;
			else if (i.length === 0) single = i[0];
			
			var copy = (!single || to.root_id != single.root_id);
			return copy ? "copy" : "move";
		};
					
		this.canDragAndDrop = function(to, itm) {
			var single = false;	
			if (!window.isArray(itm)) single = itm;
			else if (itm.length === 0) single = itm[0];
			
			if (single)
				return that.dropType(to, single) == "copy" ? mollify.filesystem.canCopyTo(single, to) : mollify.filesystem.canMoveTo(single, to);
			
			var can = true;
			for(var i=0;i<itm.length; i++) {
				var item = itm[i];
				if (!(that.dropType(to, item) == "copy" ? mollify.filesystem.canCopyTo(item, to) : mollify.filesystem.canMoveTo(item, to))) {
					can = false;
					break;
				}
			}
			return can;
		};
		
		this.onDragAndDrop = function(to, itm) {
			var copy = (that.dropType(to, itm) == 'copy');
			//console.log((copy ? "copy " : "move ") +item.name+" to "+to.name);
			
			if (copy) mollify.filesystem.copy(itm, to);
			else mollify.filesystem.move(itm, to);
		};
		
		this.folder = function() {
			var opt = {
				title: function() {
					return this.data.title ? this.data.title : mollify.ui.texts.get(this.data['title-key']);
				}
			};
			var $h = $("#mollify-folderview-header-content").empty();
						
			if (that._currentFolder && that._currentFolder.type) {
				if (that._customFolderTypes[that._currentFolder.type]) {
					that._customFolderTypes[that._currentFolder.type].onRenderFolderView(that._currentFolder, that._currentFolderInfo, $h, $tb);
				}
			} else {
				var currentRoot = (that._currentFolderInfo && that._currentFolderInfo.hierarchy) ? that._currentFolderInfo.hierarchy[0] : false;
				that.rootNav.setActive(currentRoot);
				
				if (that._currentFolder)
					mollify.dom.template("mollify-tmpl-fileview-header", {canWrite: that._canWrite(), folder: that._currentFolder}).appendTo($h);
				else
					mollify.dom.template("mollify-tmpl-main-rootfolders").appendTo($h);

				var $tb = $("#mollify-fileview-folder-tools").empty();
				var $fa = $("#mollify-fileview-folder-actions");

				if (that._currentFolder) {
					if (that._canWrite()) {
						mollify.dom.template("mollify-tmpl-fileview-foldertools-action", { icon: 'icon-folder-close' }, opt).appendTo($tb).click(function() {
							mollify.ui.controls.dynamicBubble({element: $(this), content: mollify.dom.template("mollify-tmpl-main-createfolder-bubble"), handler: {
								onRenderBubble: function(b) {
									var $i = $("#mollify-mainview-createfolder-name-input");
									$("#mollify-mainview-createfolder-button").click(function(){
										var name = $i.val();
										if (!name) return;

										b.hide();
										mollify.filesystem.createFolder(that._currentFolder, name);
									});
									$i.focus();
								}
							}});
							return false;
						});
						if (mollify.ui.uploader) mollify.dom.template("mollify-tmpl-fileview-foldertools-action", { icon: 'icon-download-alt' }, opt).appendTo($tb).click(function() {
							mollify.ui.controls.dynamicBubble({element: $(this), content: mollify.dom.template("mollify-tmpl-main-addfile-bubble"), handler: {
								onRenderBubble: function(b) {
									mollify.ui.uploader.initUploadWidget($("#mollify-mainview-addfile-upload"), {
										url: mollify.filesystem.getUploadUrl(that._currentFolder),
										handler: that._getUploadHandler(b)
									});
									
									if (!mollify.features.hasFeature('retrieve_url')) {
										$("#mollify-mainview-addfile-retrieve").remove();
									}
									var onRetrieve = function() {
										var val = $("#mollify-mainview-addfile-retrieve-url-input").val();
										if (!val || val.length < 1 || val.substring(0,4).toLowerCase().localeCompare('http') !== 0) return false;
										b.close();
										that.onRetrieveUrl(val);
									};
									$("#mollify-mainview-addfile-retrieve-url-input").bind('keypress', function(e) {
										if ((e.keyCode || e.which) == 13) onRetrieve();
									});
									$("#mollify-mainview-addfile-retrieve-button").click(onRetrieve);
								}
							}});
							return false;
						});
					
						// FOLDER
						var actionsElement = mollify.dom.template("mollify-tmpl-fileview-foldertools-action", { icon: 'icon-cog', dropdown: true }, opt).appendTo($fa);
						mollify.ui.controls.dropdown({
							element: actionsElement,
							items: false,
							hideDelay: 0,
							style: 'submenu',
							onShow: function(drp, items) {
								if (items) return;
							
								that.getItemActions(that._currentFolder, function(a) {
									if (!a) {
										drp.hide();
										return;
									}
									drp.items(a);
								});
							}
						});
					}
				
					that.setupHierarchy(that._currentFolderInfo.hierarchy, $tb);
				
					$("#mollify-folderview-items").addClass("loading");
				}

				if (that._dndUploader)
					that._dndUploader.setUrl(that._canWrite() ? mollify.filesystem.getUploadUrl(that._currentFolder) : false);
				that.addCommonFileviewActions($fa);
			}
			
			mollify.ui.process($h, ['localize']);

			that._scrollOutThreshold = $("#mollify-folderview-header").outerHeight() + 40;
			that._scrollInThreshold = that._scrollOutThreshold - 60;
			$("#mollify-folderview-detachholder").css("height", (that._scrollInThreshold + 40)+"px");
			$("#mollify-folderview").removeClass("detached");
			that.onResize();
			that._updateSelect();
		};
		
		this.addCommonFileviewActions = function($c) {
			//TODO kaikki action-luonnit omaan luokkaan
			var opt = {
				title: function() {
					return this.data.title ? this.data.title : mollify.ui.texts.get(this.data['title-key']);
				}
			};
			
			// SELECT
			that._selectModeBtn = mollify.dom.template("mollify-tmpl-fileview-foldertools-action", { icon: 'icon-check', dropdown: true, style: "narrow", action: true }, opt).appendTo($c).click(that._onToggleSelect);
			mollify.ui.controls.dropdown({
				element: that._selectModeBtn,
				items: false,
				hideDelay: 0,
				style: 'submenu',
				onShow: function(drp) {						
					that._getSelectionActions(function(a) {
						if (!a) {
							drp.hide();
							return;
						}
						drp.items(a);
					});
				}
			});
			
			// REFRESH					
			mollify.dom.template("mollify-tmpl-fileview-foldertools-action", { icon: 'icon-refresh' }, opt).appendTo($c).click(that.refresh);	
		};
		
		this._getViewItems = function() {
			//if (that._currentFolder && that._currentFolder.type && that._customFolderTypes[that._currentFolder.type])
			//	return
			return that._currentFolderInfo.items;
		};
		
		this._getSelectionActions = function(cb) {
			var result = [];
			if (that._selectMode && that._selectedItems.length > 0) {
				var plugins = mollify.plugins.getItemCollectionPlugins(that._selectedItems);		
				result = mollify.helpers.getPluginActions(plugins);
				if (result.length > 0)
					result.unshift({"title" : "-"});
			}
			result.unshift({"title-key" : "mainViewFileViewSelectNone", callback: function() { that._updateSelect([]); } });
			result.unshift({"title-key" : "mainViewFileViewSelectAll", callback: function() { that._updateSelect(that._getViewItems()); } });
			cb(mollify.helpers.cleanupActions(result));
		};
		
		this._onToggleSelect = function() {
			that._selectMode = !that._selectMode;
			that._updateSelect();
		};
		
		this._updateSelect = function(sel) {
			if (sel !== undefined) {
				that._selectedItems = sel;
				that._selectMode = true;
			}
			if (that._selectMode)
				that._selectModeBtn.addClass("active");
			else
				that._selectModeBtn.removeClass("active");
			that.itemWidget.setSelectMode(that._selectMode);
			if (that._selectMode) that.itemWidget.setSelection(that._selectedItems);
		};
		
		this._getRootItems = function() {
			var rootItems = [];
			var rootCb = function(r) {
				return function() { that.changeToFolder(r); };
			};
			for(var i=0,j=mollify.session.folders.length; i<j;i++) {
				var root = mollify.session.folders[i];
				rootItems.push({
					title: root.name,
					callback: rootCb(root)
				});
			}
			return rootItems;
		};
					
		this.setupHierarchy = function(h, $t) {
			var items = h;
			var p = $t.append(mollify.dom.template("mollify-tmpl-fileview-folder-hierarchy", {items: items}));
			
			mollify.ui.controls.dropdown({
				element: $("#mollify-folder-hierarchy-item-root"),
				items: that._getRootItems(),
				hideDelay: 0,
				style: 'submenu'
			});
			
			var $hi = $(".mollify-folder-hierarchy-item").click(function() {
				var folder = $(this).tmplItem().data;
				that.changeToFolder(folder);
			});
			
			if (mollify.ui.draganddrop) {
				mollify.ui.draganddrop.enableDrop($hi.find("a"), {
					canDrop : function($e, e, obj) {
						if (!obj || obj.type != 'filesystemitem') return false;
						var itm = obj.payload;
						var me = $e.parent().tmplItem().data;
						return that.canDragAndDrop(me, itm);
					},
					dropType : function($e, e, obj) {
						if (!obj || obj.type != 'filesystemitem') return false;
						var itm = obj.payload;
						var me = $e.tmplItem().data;
						return that.dropType(me, itm);
					},
					onDrop : function($e, e, obj) {
						if (!obj || obj.type != 'filesystemitem') return;
						var itm = obj.payload;
						var me = $e.parent().tmplItem().data;
						that.onDragAndDrop(me, itm);
					}
				});
			}
		};
		
		this.isListView = function() { return that._viewStyle === 0; };
		
		this.initList = function() {
			var $h = $("#mollify-folderview-header-items").empty();
			if (that.isListView()) {
				var cols = mollify.settings["list-view-columns"];
				that.itemWidget = new FileList('mollify-folderview-items', $h, 'main', this._filelist, cols);
			} else {
				var thumbs = !!mollify.session.features.thumbnails;
				that.itemWidget = new IconView('mollify-folderview-items', $h, 'main', that._viewStyle == 1 ? 'iconview-small' : 'iconview-large', thumbs);
			}
			
			that.itemWidget.init({
				onFolderSelected : that.onFolderSelected,
				canDrop : that.canDragAndDrop,
				dropType : that.dropType,
				onDrop : that.onDragAndDrop,
				onClick: function(item, t, e) {
					if (that.isListView() && t != 'icon') {
						var col = that._filelist.columns[t];
						if (col["on-click"]) {
							col["on-click"](item, that._currentFolderInfo.data);
							return;
						}
					}
					var showContext = false;
					if (that.isListView()) {
						if (!item.is_file) {
							// folder click goes into the folder, icon opens context
							if (t=='name') that.changeToFolder(item);
							else if (t=='icon') showContext = true;
						} else {
							if (t=='name' || t=='icon') showContext = true;
						}
					} else {
						if (t=='info' || item.is_file) showContext = true;
						else that.changeToFolder(item); 
					}
					
					if (showContext) {
						that.itemContext.open({
							item: item,
							element: that.itemWidget.getItemContextElement(item),
							viewport: that.itemWidget.getContainerElement(),
							folder: that._currentFolder,
							folder_permission: that._currentFolderInfo ? that._currentFolderInfo.permission : false
						});
					}
				},
				onDblClick: function(item) {
					if (item.is_file) return;
					that.changeToFolder(item);
				},
				onRightClick: function(item, t, e) {
					that.showActionMenu(item, that.itemWidget.getItemContextElement(item));
				},
				onContentRendered : function(items, data) {
					if (that._currentFolder && that._currentFolder.type && that._customFolderTypes[that._currentFolder.type]) {
						if (that._customFolderTypes[that._currentFolder.type].onItemListRendered)
							that._customFolderTypes[that._currentFolder.type].onItemListRendered(that._currentFolder, that._currentFolderInfo, items);
					}
				},
				getSelectedItems : function() {
					if (!that._selectMode || that._selectedItems.length === 0) return false;
					return that._selectedItems;
				},
				onSelectUnselect: function(item) {
					if (that._selectedItems.indexOf(item) >= 0) that._selectedItems.remove(item);
					else that._selectedItems.push(item);
					that.itemWidget.setSelection(that._selectedItems);
				}
			});
		};
		
		this.data = function() {
			$("#mollify-folderview-items").removeClass("loading");
			
			var descriptionExists = that._currentFolderInfo.data && that._currentFolderInfo.data['core-parent-description'];
			if (descriptionExists)
				$("#mollify-folder-description").text(that._currentFolderInfo.data['core-parent-description']);
			
			var $dsc = $("#mollify-folder-description");
			var descriptionEditable = that._currentFolder && !that._currentFolder.type && $dsc.length > 0 && mollify.session.features.descriptions && mollify.session.admin;
			if (descriptionEditable) {
				mollify.ui.controls.editableLabel({element: $dsc, hint: mollify.ui.texts.get('mainviewDescriptionHint'), onedit: function(desc) {
					mollify.service.put("filesystem/"+that._currentFolder.id+"/description/", {description: desc});
				}});
			} else {
				if (!descriptionExists) $dsc.hide();
			}
			that.updateItems(that._currentFolderInfo.items, that._currentFolderInfo.data);
		};
		
		this.updateItems = function(items, data) {
			that._items = items;
			that._itemsById = mollify.helpers.mapByKey(items, "id");
			if (that._selectedItems) {
				var existing = [];
				var ids = {};
				$.each(that._selectedItems, function(i, itm) {
					var newItem = that._itemsById[itm.id];
					if (!newItem || ids[itm.id]) return;
					existing.push(newItem);
					ids[itm.id] = true;
				});
				that._selectedItems = existing;
			}
			//$("#mollify-folderview-items").css("top", $("#mollify-folderview-header").outerHeight()+"px");
			that.itemWidget.content(items, data);
			if (that._selectMode) that.itemWidget.setSelection(that._selectedItems);
		};
		
		this.showActionMenu = function(item, c) {
			c.addClass("open");
			var popup = mollify.ui.controls.popupmenu({ element: c, onHide: function() {
				c.removeClass("open");
				that.itemWidget.removeHover();
			}});
			
			that.getItemActions(item, function(a) {
				if (!a) {
					popup.hide();
					return;
				}
				popup.items(a);
			});
		};
		
		this.getItemActions = function(item, cb) {
			mollify.filesystem.itemDetails(item, mollify.plugins.getItemContextRequestData(item)).done(function(d) {
				if (!d) {
					cb([]);
					return;
				}
				var ctx = {
					details: d,
					folder: that._currentFolder,
					folder_permission: d.parent_permission
				};
				cb(mollify.helpers.cleanupActions(mollify.helpers.getPluginActions(mollify.plugins.getItemContextPlugins(item, ctx))));
			});
		};
	};
	
	var UploadProgress = function($e) {
		var t = this;
		this._h = $e.height();
		t._$title = $e.find(".title");
		t._$speed = $e.find(".speed");
		t._$bar = $e.find(".bar");
		
		return {
			show : function(title, cb) {
				$e.css("bottom", (0 - t._h)+"px");
				t._$title.text(title ? title : "");
				t._$speed.text("");
				t._$bar.css("width", "0%");
				$e.show().animate({"bottom": "0"}, 500, cb);
			},
			set : function(progress, speed) {
				t._$bar.css("width", progress+"%");
				t._$speed.text(speed ? speed : "");
			},
			hide : function(cb) {
				setTimeout(function() {
					$e.animate({"bottom": (0 - t._h) + "px"}, 500, function() {
						t._$bar.css("width", "0%");
						$e.hide();
						if (cb) cb();
					});
				}, 1000);
			}
		}
	};
	
	var IconView = function(container, $headerContainer, id, cls, thumbs) {
		var t = this;
		t.$c = $("#"+container);
		t.viewId = 'mollify-iconview-'+id;
		
		this.init = function(p) {
			t.p = p;
			
			$headerContainer.append("<div class='mollify-iconview-header'></div>");
			
			mollify.dom.template("mollify-tmpl-iconview", {viewId: t.viewId}).appendTo(t.$c.empty());
			t.$l = $("#"+t.viewId);
			if (cls) t.$l.addClass(cls);
		};
		
		this.content = function(items, data) {
			t.items = items;
			t.data = data;
			
			var supportedThumbs = ["jpg", "png", "gif", "jpeg"];	//TODO settings
			
			mollify.dom.template("mollify-tmpl-iconview-item", items, {
				showThumb: function(item) {
					if (!thumbs || !item.is_file) return false;
					return (supportedThumbs.indexOf(item.extension) >= 0);
				},
				thumbUrl: function(item) {
					return mollify.service.url("filesystem/"+item.id+"/thumbnail/");
				},
				typeClass : function(item) {
					var c = item.is_file ? 'item-file' : 'item-folder';
					if (item.is_file && item.extension) c += ' item-type-'+item.extension;
					else if (!item.is_file && item.id == item.root_id) c += ' item-root-folder';
					return c;
				}
			}).appendTo(t.$l.empty());
			
			var $items = t.$l.find(".mollify-iconview-item").hover(function() {
				$(this).addClass("hover");
			}, function() {
				$(this).removeClass("hover");
			}).bind("contextmenu",function(e){
				e.preventDefault();
				var $t = $(this);
				t.p.onRightClick($t.tmplItem().data, "", $t);
				return false;
			}).single_double_click(function(e) {
				var $t = $(this);
				var itm = $t.tmplItem().data;
				var $trg = $(e.target);
				if ($trg.hasClass("mollify-iconview-item-sel-option")) {
					t.p.onSelectUnselect(itm);
					return;
				}
				var col = "";
				if ($trg.parent().hasClass("mollify-iconview-item-info")) col = "info";

				t.p.onClick(itm, col, $t);
			},function() {
				t.p.onDblClick($(this).tmplItem().data);
			}).attr('unselectable', 'on').css({
				'-moz-user-select':'none',
				'-webkit-user-select':'none',
				'user-select':'none',
				'-ms-user-select':'none'
			});
			/*.draggable({
				revert: "invalid",
				distance: 10,
				addClasses: false,
				zIndex: 2700
			}).droppable({
				hoverClass: "drophover",
				accept: function(i) { return t.p.canDrop ? t.p.canDrop($(this).tmplItem().data, $(i).tmplItem().data) : false; }
			})*/
			
			if (mollify.ui.draganddrop) {
				mollify.ui.draganddrop.enableDrag($items, {
					onDragStart : function($e, e) {
						var item = $e.tmplItem().data;
						var sel = t.p.getSelectedItems();
						if (!sel) sel = item;
						else if (sel.indexOf(item) < 0) sel.push(item);
						return {type:'filesystemitem', payload: sel};
					}
				});
				mollify.ui.draganddrop.enableDrop(t.$l.find(".mollify-iconview-item.item-folder"), {
					canDrop : function($e, e, obj) {
						if (!t.p.canDrop || !obj || obj.type != 'filesystemitem') return false;
						var i = obj.payload;
						var me = $e.tmplItem().data;
						return t.p.canDrop(me, i);
					},
					dropType : function($e, e, obj) {
						if (!t.p.dropType || !obj || obj.type != 'filesystemitem') return false;
						var i = obj.payload;
						var me = $e.tmplItem().data;
						return t.p.dropType(me, i);
					},
					onDrop : function($e, e, obj) {
						if (!obj || obj.type != 'filesystemitem') return;
						var i = obj.payload;
						var me = $e.tmplItem().data;
						if (t.p.onDrop) t.p.onDrop(me, i);
					}
				});
			}
			
			t.p.onContentRendered(items, data);
		};
		
		/*this.getItemContextElement = function(item) {
			return t.$l.find("#mollify-iconview-item-"+item.id);
		};*/
		
		this.getItemContextElement = function(item) {
			return t.$l.find("#mollify-iconview-item-"+item.id);
		};
		
		this.getContainerElement = function() {
			return t.$l;	
		};
		
		this.removeHover = function() {
			t.$l.find(".mollify-iconview-item.hover").removeClass('hover');
		};
		
		this.setSelectMode = function(sm) {
			t.$l.find(".mollify-iconview-item.selected").removeClass("selected");
			if (sm) {
				t.$l.addClass("select");
			} else {
				t.$l.removeClass("select");
			}
		};
		
		this.setSelection = function(items) {
			t.$l.find(".mollify-iconview-item.selected").removeClass("selected");
			$.each(items, function(i, itm) {
				t.$l.find("#mollify-iconview-item-"+itm.id).addClass("selected");
			});
		};
	};
		
	var FileList = function(container, $headerContainer, id, filelistSpec, columns) {
		var t = this;
		t.minColWidth = 25;
		t.$c = $("#"+container);
		t.$hc = $headerContainer;
		t.listId = 'mollify-filelist-'+id;
		t.cols = [];
		t.sortCol = false;
		t.sortOrderAsc = true;
		t.colWidths = {};
		
		for (var colId in columns) {
			var col = filelistSpec.columns[colId];
			if (!col) continue;
			
			var colSpec = $.extend({}, col, columns[colId]);
			t.cols.push(colSpec);
		}
		
		this.init = function(p) {
			t.p = p;
			mollify.dom.template("mollify-tmpl-filelist-header", {listId: t.listId}).appendTo(t.$hc.empty());
			mollify.dom.template("mollify-tmpl-filelist", {listId: t.listId}).appendTo(t.$c.empty());
			t.$l = $("#"+t.listId);
			t.$h = $("#"+t.listId+"-header-cols");
			t.$i = $("#"+t.listId+"-items");
			
			mollify.dom.template("mollify-tmpl-filelist-headercol", t.cols, {
				title: function(c) {
					var k = c['title-key'];
					if (!k) return "";
					
					return mollify.ui.texts.get(k);
				} 
			}).appendTo(t.$h);
			
			t.$h.find(".mollify-filelist-col-header").each(function(i) {
				var $t = $(this);
				var ind = $t.index();
				if (ind <= 1) return;
				var col = t.cols[ind-2];
				
				var minColWidth = col["min-width"] || t.minColWidth;
				
				$t.css("min-width", minColWidth);
				if (col.width) $t.css("width", col.width);
				
				$t.find(".mollify-filelist-col-header-title").click(function() {
					t.onSortClick(col);
				});
				
				if (i != (t.cols.length-1)) {
					$t.resizable({
						handles: "e",
						minWidth: minColWidth,
						//autoHide: true,
						start: function(e, ui) {
							//TODO max?
							var max = t.$c.width() - (t.cols.length * t.minColWidth);
							$t.resizable("option", "maxWidth", max);
						},
						stop: function(e, ui) {
							var w = $t.width();
							t.colWidths[col.id] = w;
							t.updateColWidth(col.id, w);
						}
					});/*.draggable({
						axis: "x",
						helper: "clone",
						revert: "invalid",
						distance: 30
					});*/
				}
				if (col["on-init"]) col["on-init"](t);
			});
			t.items = [];
			t.data = {};
			t.onSortClick(t.cols[0]);
		};
	
		this.updateColWidths = function() {
			for (var colId in t.colWidths) t.updateColWidth(colId, t.colWidths[colId]);
		};
			
		this.updateColWidth = function(id, w) {
			$(".mollify-filelist-col-"+id).width(w);
		};
		
		this.onSortClick = function(col) {
			if (col.id != t.sortCol.id) {
				t.sortCol = col;
				t.sortOrderAsc = true;
			} else {
				t.sortOrderAsc = !t.sortOrderAsc;
			}
			t.refreshSortIndicator();
			t.content(t.items, t.data);
		};
		
		this.sortItems = function() {
			var s = t.sortCol.sort;
			t.items.sort(function(a, b) {
				return s(a, b, t.sortOrderAsc ? 1 : -1, t.data);
			});
		};
		
		this.refreshSortIndicator = function() {
			t.$h.find(".mollify-filelist-col-header").removeClass("sort-asc").removeClass("sort-desc");
			$("#mollify-filelist-col-header-"+t.sortCol.id).addClass("sort-" + (t.sortOrderAsc ? "asc" : "desc"));
		};
		
		this.getDataRequest = function() {
			var rq = {};
			for (var i=0, j=t.cols.length; i<j; i++) {
				var c = t.cols[i];
				if (c['request-id']) rq[c['request-id']] = {};
			}
			return rq;
		};
		
		this.content = function(items, data) {
			t.items = items;
			t.data = data;
			t.sortItems();
			
			mollify.dom.template("mollify-tmpl-filelist-item", items, {
				cols: t.cols,
				typeClass : function(item) {
					var c = item.is_file ? 'item-file' : 'item-folder';
					if (item.is_file && item.extension) c += ' item-type-'+item.extension;
					else if (!item.is_file && item.id == item.root_id) c += ' item-root-folder';
					return c;
				},
				col: function(item, col) {
					return col.content(item, t.data);
				},
				itemColStyle: function(item, col) {
					var style="min-width:"+(col["min-width"] || t.minColWidth)+"px";
					if (col.width) style = style+";width:"+col.width+"px";
					return style;
				}
			}).appendTo(t.$i.empty());
			
			for (var i=0,j=t.cols.length; i<j; i++) {
				var col = t.cols[i];
				if (col["on-render"]) col["on-render"](t);
			}
			
			var $items = t.$i.find(".mollify-filelist-item");
			$items.hover(function() {
				$(this).addClass("hover");
			}, function() {
				$(this).removeClass("hover");
			}).bind("contextmenu",function(e){
				e.preventDefault();
				t.onItemClick($(this), $(e.toElement || e.target), false);
				return false;
			}).single_double_click(function(e) {
				e.preventDefault();
				e.stopPropagation();
				t.onItemClick($(this), $(e.toElement || e.target), true);
				return false;
			},function() {
				t.p.onDblClick($(this).tmplItem().data);
			});
			
			if (mollify.ui.draganddrop) {
				mollify.ui.draganddrop.enableDrag($items, {
					onDragStart : function($e, e) {
						var item = $e.tmplItem().data;
						var sel = t.p.getSelectedItems();
						if (!sel) sel = item;
						else if (sel.indexOf(item) < 0) sel.push(item);
						return {type:'filesystemitem', payload: sel};
					}
				});
				mollify.ui.draganddrop.enableDrop(t.$i.find(".mollify-filelist-item.item-folder"), {
					canDrop : function($e, e, obj) {
						if (!t.p.canDrop || !obj || obj.type != 'filesystemitem') return false;
						var i = obj.payload;
						var me = $e.tmplItem().data;
						return t.p.canDrop(me, i);
					},
					dropType : function($e, e, obj) {
						if (!t.p.dropType || !obj || obj.type != 'filesystemitem') return false;
						var i = obj.payload;
						var me = $e.tmplItem().data;
						return t.p.dropType(me, i);
					},
					onDrop : function($e, e, obj) {
						if (!obj || obj.type != 'filesystemitem') return;
						var i = obj.payload;
						var me = $e.tmplItem().data;
						if (t.p.onDrop) t.p.onDrop(me, i);
					}
				});
			}
			
			/*.click(function(e) {
				e.preventDefault();
				t.onItemClick($(this), $(e.srcElement), true);
				return false;
			})*/
	
			/*t.$i.find(".mollify-filelist-quickmenu").click(function(e) {
				e.preventDefault();
				var $t = $(this);
				t.p.onMenuOpen($t.tmplItem().data, $t);
			});*/
	
			/*t.$i.find(".mollify-filelist-item-name-title").click(function(e) {
				e.preventDefault();
				t.p.onClick($(this).tmplItem().data, "name");
			});*/
			/*t.$i.find(".item-folder .mollify-filelist-item-name-title").click(function(e) {
				e.preventDefault();
				t.p.onFolderSelected($(this).tmplItem().data);
			});*/
			
			t.updateColWidths();
			
			t.p.onContentRendered(items, data);
		};
		
		this.onItemClick = function($item, $el, left) {
			var i = $item.find(".mollify-filelist-col").index($el.closest(".mollify-filelist-col"));
			if (i<0) return;
			var itm = $item.tmplItem().data;
			if (i === 0) {
				t.p.onSelectUnselect(itm);
				return;
			}
			var colId = (i === 1 ? "icon" : t.cols[i-2].id);
			if (left)
				t.p.onClick(itm, colId, $item);
			else
				t.p.onRightClick(itm, colId, $item);
		};
			
		this.getItemContextElement = function(item) {
			var $i = t.$i.find("#mollify-filelist-item-"+item.id);
			return $i.find(".mollify-filelist-col-name") || $i; 
		};
		
		this.getItemForElement = function($el) {
			return $el.tmplItem().data;
		};
		
		this.getContainerElement = function() {
			return t.$i;	
		};
		
		this.removeHover = function() {
			t.$i.find(".mollify-filelist-item.hover").removeClass('hover');
		};
		
		this.setSelectMode = function(sm) {
			t.$i.find(".mollify-filelist-item.selected").removeClass("selected");
			if (sm) {
				t.$l.addClass("select");
				t.$h.addClass("select");
			} else {
				t.$l.removeClass("select");
				t.$h.removeClass("select");				
			}
		};
		
		this.setSelection = function(items) {
			t.$i.find(".mollify-filelist-item.selected").removeClass("selected");
			$.each(items, function(i, itm) {
				t.$i.find("#mollify-filelist-item-"+itm.id).addClass("selected");
			});
		};
	};
}(window.jQuery, window.mollify);