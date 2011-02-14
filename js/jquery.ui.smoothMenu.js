﻿/// <reference path="jquery-1.5.js" />
/*!
* SmoothMenu addon for jQuery UI
* Copyright 2011, まどがい
* license MIT-style License.
*
* Depends:
*   jquery.ui.core.js
*   jquery.ui.widget.js
*
* Inspired by MenuMatic
* http://greengeckodesign.com/menumatic
*/
(function ($, undefined) {
	var isNumber = function (value) {
		return typeof value === "number" && isFinite(value);
	};

	$.widget('ui.smoothMenu', {

		widgetEventPrefix: 'smoothMenu',

		_wrapToWidgetEvent: function (type) {
			return type + '.' + this.widgetEventPrefix;
		},

		options: {
			childTag: 'li',
			delay: 1000,
			direction: 'horizontal',
			dockId: 'ui_smooth_menu_container',
			duration: 200,
			easing: 'swing',
			opacity: 0.95,
			parentTag: 'ul',
			zIndex: 1
		},

		_create: function () {
			var self = this;
			var options = self.options;
			var $elm = self.element;
			var $rootContainer = self.rootContainer();
			var $parent = $elm.children(options.parentTag + ':first');

			// 再帰的に子要素を探索して、子要素から先にコンテナに入れます。
			var childOption = $.extend({}, options, {
				direction: 'horizontal',
				zIndex: options.zIndex + 1
			});
			// 子要素まですべて適用してからbindしないと先にイベントが動いてしまうため、あとからイベントを付加します。
			options.childNodes = $parent.children(options.childTag).smoothMenu(childOption).bind({
				smoothmenuonhide: function (event, $elm) {
					self.hide();
				}
			});

			options.defaultCss = {
				marginLeft: $parent.css('marginLeft'),
				marginTop: $parent.css('marginTop'),
				opacity: $parent.css('opacity'),
				visibility: $parent.css('visibility')
			};

			$elm.addClass('ui-widget ui-state-default ui-widget-content').bind(self._wrapToWidgetEvent('mouseenter'), function (event) {
				$elm.addClass('ui-state-hover');
				self._mouseEnter(event);
				$(this).smoothMenu('show');
			}).bind(self._wrapToWidgetEvent('mouseleave'), function (event) {
				$elm.removeClass('ui-state-hover');
				self._mouseLeave(event);
				setTimeout(function () {
					$elm.smoothMenu('hide');
				}, options.delay);
			});

			if ($parent.length > 0) {
				var height = $parent.outerHeight(true);
				var width = $parent.outerWidth(true);
				var $container = $('<div />', {
					'class': '.ui-widget-content'
				}).css({
					display: 'none',
					height: String(height) + 'px',
					overflow: 'hidden',
					position: 'absolute',
					zIndex: options.zIndex
				}).bind(self._wrapToWidgetEvent('mouseenter'), function (event) {
					self._mouseEnter(event);
				}).bind(self._wrapToWidgetEvent('mouseleave'), function (event) {
					self._mouseLeave(event);
				}).append($parent).appendTo($rootContainer);
				options.container = $container;
				// Widthは後から設定しないとWebkit系で表示が崩れます。
				$container.css({
					width: String($parent.outerWidth(true)) + 'px'
				});
			} else {
				options.container = $();
			}

			$elm.smoothMenu('hide', 0);
		},

		destroy: function () {
			var self = this;
			var options = self.options;
			var $elm = self.element;

			$elm.removeClass('ui-widget ui-state-default ui-state-hover ui-widget-content')

			$elm.unbind('.' + self.widgetEventPrefix);
			var $container = options.container;

			// 子要素を再帰的に復元します。
			options.childNodes.smoothMenu('destroy');

			var $parent = $container.children(options.parentTag);
			$parent.stop(true, true).css(options.defaultCss);

			$elm.append($parent);
			$container.remove();
			self._removeContainerIfEmpty();
			return self;
		},

		rootContainer: function () {
			return this._getOrCreateContainer();
		},

		show: function (duration) {
			var self = this;
			var options = this.options;
			var $elm = self.element;
			var $container = options.container;
			var $parent = $container.children(options.parentTag);
			duration = isNumber(duration) ? duration : options.duration;

			if (options.disabled) {
				return;
			}

			$elm.siblings().smoothMenu('hide', 100);

			if (options.visible) {
				return;
			}

			var isContinue = self._trigger('beforeShow', null, $elm);
			if (isContinue === false) {
				return;
			}

			var offset = $elm.offset();
			var extendWidth = options.direction === 'horizontal' ? $elm.outerWidth(true) : 0;
			var extendHeight = (function () {
				if (options.direction !== 'horizontal') {
					return $elm.outerHeight(true);
				} else {
					var containerHeight = $container.outerHeight(true) || 0;
					var windowHeight = $(window).height();
					return Math.min(windowHeight - (offset.top + containerHeight), 0);
				}
			})();
			$container.css({
				left: String(offset.left + extendWidth) + 'px',
				top: String(offset.top + extendHeight) + 'px'
			}).show();

			$parent.stop(true).animate({
				marginLeft: '0px',
				marginTop: '0px',
				opacity: options.opacity
			}, {
				duration: duration,
				easing: options.easing
			});

			options.visible = true;

			self._trigger('onShow', null, $elm);
		},

		hide: function (duration) {
			var self = this;
			var options = self.options;
			var $elm = self.element;
			var $container = options.container;
			var $parent = $container.children(options.parentTag);
			duration = isNumber(duration) ? duration : options.duration;

			if (options.disabled) {
				return;
			}

			if (options.visible === false) {
				return;
			}

			if (self.isMouseOver(true)) {
				return;
			}

			var isContinue = self._trigger('beforeHide', null, $elm);
			if (isContinue === false) {
				return;
			}

			var marginLeft = options.direction === 'horizontal' ? -1 * $container.outerWidth() : 0;
			var marginTop = options.direction !== 'horizontal' ? -1 * $container.outerHeight() : 0;

			$parent.stop(true).animate({
				marginLeft: String(marginLeft) + 'px',
				marginTop: String(marginTop) + 'px',
				opacity: 0
			}, {
				duration: duration,
				easing: options.easing,
				complete: function () {
					$container.hide();
				}
			});
			self._trigger('onHide', null, $elm);

			options.visible = false;

			// 親が閉じられたら子要素も同時に閉じます。
			options.childNodes.smoothMenu('hide');
		},

		isMouseOver: function (deepSearch) {
			var isMouseOver = this.options.isMouseOver;
			if (deepSearch) {
				var hasMouseOverChild = this._hasMouseOverChild();
				return isMouseOver || hasMouseOverChild;
			} else {
				return isMouseOver;
			}
		},

		_hasMouseOverChild: function () {
			var $childNodes = this.options.childNodes;
			var hasMouseOverChild = $childNodes.filter(function () {
				return $(this).smoothMenu('isMouseOver', true);
			}).length > 0;
			return hasMouseOverChild;
		},

		_mouseEnter: function (event) {
			this.options.isMouseOver = true;
		},

		_mouseLeave: function (event) {
			this.options.isMouseOver = false;
		},

		_getOrCreateContainer: function () {
			var id = this.options.dockId;
			var $container = $('#' + id);
			if ($container.length === 0) {
				$container = $('<div />', {
					id: id,
					'class': 'ui-widget ui-smoothMenu'
				}).appendTo(document.body);
			}
			return $container;
		},

		_removeContainerIfEmpty: function () {
			var $container = this._getOrCreateContainer();
			if ($container.is(':empty')) {
				$container.remove();
			}
		}

	});

	$.extend($.ui.smoothMenu, {
		version: "0.2.0"
	});

})(jQuery);
