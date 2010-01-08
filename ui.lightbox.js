/*globals document,window,$,jQuery,Image */
/*jslint white: true, browser: true, onevar: true, undef: true, eqeqeq: true, plusplus: true, bitwise: true, regexp: true, strict: true, newcap: true, immed: true, indent: 2 */

"use strict";

/*
 * jQuery UI Lightbox
 *
 * Copyright (c) 2009 Benjamin Doherty
 * Dual licensed under the MIT (MIT-LICENSE.txt)
 * and GPL (GPL-LICENSE.txt) licenses.
 *
 * Depends:
 *  ui.core.js
 *  ui.dialog.js
 *  jquery.mousewheel.js (optional)
 */
(function ($) {

  $.widget('ui.lightbox', {
    _init: function () {
      var self = this;

      // consider event delegation to make this more dynamic
      $(this.options.selector, this.element).click(function (event) {
        event.preventDefault();
        self.open(this);
      });
      $(document).keydown(function (event) {
        if (!self.lightbox || !self.lightbox.dialog('isOpen')) {
          return;
        }
        switch (event.keyCode) {
        case $.ui.keyCode.ESCAPE:
          if (!self.lightbox.dialog('isOpen')) {
            return;
          }
          if (self.options.closeOnEscape) {
            self.lightbox
              .unbind('dialogclose.lightbox')
              .bind('dialogclose.lightbox', self._dialogClose)
              .dialog('close')
            event.preventDefault();
          }
          break;
        case $.ui.keyCode.LEFT:
          self.prev("right");
          event.preventDefault();
          break;
        case $.ui.keyCode.UP:
          self.prev("up");
          event.preventDefault();
          break;
        case $.ui.keyCode.RIGHT:
          self.next("left");
          event.preventDefault();
          break;
        case $.ui.keyCode.DOWN:
          self.next("down");
          event.preventDefault();
          break;
        }
      });
      if ($.fn.mousewheel) {
        $(document).mousewheel(function (event, delta) {
          if (!self.lightbox.dialog('isOpen')) {
            return;
          }
          event.preventDefault();
          if (self.lightbox.is(":animated")) {
            return;
          }
          if (delta < 0) {
            self.next("down");
          }
          if (delta > 0) {
            self.prev("up");
          }
        });
      }
    },

    _makeDialog: function () {
      return $('<div/>').dialog({
        autoOpen: false,
        closeOnEscape: false,
        modal: false,
        show: null,
        hide: null,
        dialogClass: this.options.dialogClass,
        position: this.options.position,
        resizable: this.options.resizable,
        draggable: this.options.draggable,
        height: this.options.height,
        width: this.options.width,
        // TODO: Support overlay by implementing focus,dragstop,resizestop
        open: function (event, ui) {
          $('.ui-dialog-buttonpane button', $(this).parents('.ui-dialog'))
            .each(function (index, domElement) {
              $(domElement).addClass('button-' + index);
            });
        }
      });
    },

    _show: function (anchor) {
      var thumb = $(anchor),
        offset = thumb.offset(),
        dialog = this.lightbox.data('dialog'),
        start = {
          left: offset.left,
          top: offset.top,
          width: thumb.width(),
          height: thumb.height(),
          opacity: 0
        },
        stop = {
          left: $(dialog.uiDialog).css("left"),
          top: $(dialog.uiDialog).css("top"),
          width: $(dialog.uiDialog).width(),
          height: $(dialog.uiDialog).height(),
          opacity: 1
        };
      $(dialog.uiDialog).css(start).show('scale', { to: stop }, this.options.duration).animate(stop, this.options.duration);
    },

    _buttons: {
      'Previous': function (eventObject) {
        $(this).dialog('option', '_lightbox').prev("right");
      },
      'Next': function (eventObject) {
        $(this).dialog('option', '_lightbox').next("left");
      }
    },

    destroy: function () {
      (this.overlay && this.overlay.destroy());
      this.element
        .unbind('.lightbox')
        .removeData('lightbox');

      this._anchors().removeData('lightbox');
    },

    open: function (anchor) {
      var viewer = (this.lightbox = this._makeDialog());

      this.overlay = this.options.modal ? new $.ui.lightbox.overlay(viewer.data('dialog')) : null;
      this.setCurrentAnchor(anchor);

      viewer.dialog('option', 'buttons', this._buttons)
        .unbind('dialogclose.lightbox')
        .bind('dialogclose.lightbox', this._dialogClose)
        .dialog('open');

      this._show(anchor);

      viewer.dialog('option', '_lightbox', this);
      this._preloadNeighbours();
    },

    close: function () {
      var viewer = this.lightbox;

      (this.overlay && this.overlay.destroy());

      $.ui.lightbox.overlay.resize();

      // TODO: these need to be destroyed with the widget.
      viewer.dialog('destroy').remove();
    },

    next: function (direction) {
      this._rotate(":gt(", ":first", direction || "up");
    },

    prev: function (direction) {
      this._rotate(":lt(", ":last", direction || "down");
    },

    _anchors: function () {
      // if deemed necessary, cache selection here
      return this.element.find(this.options.selector);
    },

    _setData: function (key, value) {
      if (key === 'cursor') {
        this.options[key] = value;
        this.spinner = new $.ui.lightbox.spinner(this);
        this._display(this._loadContent(value));
        this.spinner.destroy();
      }

      $.widget.prototype._setData.apply(this, arguments);
    },

    _display: function (content) {
      var anchor = this.getCurrentAnchor(),
        viewer = this.lightbox,
        size = this._calculateSize(content),
        $el = $(content).css(size).appendTo(viewer);

      viewer.dialog('option', 'title', $(anchor).attr('title') + this.options.titleSuffix);
      viewer.dialog('option', this._resize($el, size.width, size.height));
    },

    _jQueryToString: function (input) {
      return $('<div>').append($(input).clone().show()).remove().html();
    },

    _loadContent: function (anchor) {
      var self = this,
        anchorData = $(anchor).data('lightbox') || {};

      if (!this.options.reset && anchorData.content) {
        return anchorData.content;
      }
      else {
        anchorData = {
          content: 'BUG',
          type: this.options.type ? this.options.type : this._deriveType(anchor)
        };
      }

      switch (anchorData.type) {
      case "image":
        anchorData.content = this._jQueryToString($('<img/>').attr('src', anchor.href));
        break;
      case "flash":
      case "flashvideo":
      case "quicktime":
      case "realplayer":
      case "windowsmedia":
        $(anchor).media({
          width: this.options.width,
          height: this.options.height,
          src: anchor.href,
          autoplay: 1
        }, function (element, options) {
        }, function (element, data, options, playerName) {
          anchorData.content = self._jQueryToString(data);
          $(data).media('undo');
        });
        break;
      case "iframe":
        anchorData.content = this._element('iframe').attr('src', anchor.href).attr('frameborder', 0).attr('border', 0).html();
        break;
      case "html":
      case "dom":
        anchorData.content = this._jQueryToString(anchor.href);
        break;
      case "ajax":
      case "script":
        $.ajax({
          url: anchor.href,
          type: (parseInt(self.options.post, 10) === 1) ? "POST" : "GET",
          cache: true,
          async: false,
          data: self.options.parameters,
          dataType: (anchorData.type === "ajax") ? "html" : "script",
          success: function (data, textStatus) {
            anchorData.content = data;
          }
        });
        break;
      }

      if (this.options.cache) {
        $(anchor).data('lightbox', anchorData);
      }

      return anchorData.content;
    },

    _deriveType: function (anchor) {
      var reference = anchor.href;
      if (reference.toLowerCase().match(/\.(gif|jpg|jpeg|png)(\?[0123456789]+)?$/)) {
        return "image";
      }
      if (reference.toLowerCase().match(/\.(swf)(\?[0123456789]+)?$/)) {
        return "flash";
      }
      if (reference.toLowerCase().match(/\.(flv)(\?[0123456789]+)?$/)) {
        return "flashvideo";
      }
      if (reference.toLowerCase().match(/\.(aif|aiff|aac|au|bmp|gsm|mov|mid|midi|mpg|mpeg|m4a|m4v|mp4|psd|qt|qtif|qif|qti|snd|tif|tiff|wav|3g2|3gp|wbmp)(\?[0123456789]+)?$/)) {
        return "quicktime";
      }
      if (reference.toLowerCase().match(/\.(ra|ram|rm|rpm|rv|smi|smil)(\?[0123456789]+)?$/)) {
        return "realplayer";
      }
      if (reference.toLowerCase().match(/\.(asf|avi|wma|wmv)(\?[0123456789]+)?$/)) {
        return "windowsmedia";
      }
      return "ajax";
    },

    _preloadNeighbours: function () {
      var anchors = this._anchors(),
        index = anchors.index(this.getCurrentAnchor()),
        self = this;
      anchors.filter(this._neighbours(index, anchors.length)).each(function () {
        self._loadContent(this);
      });
    },

    _neighbours: function (index, length) {
      return ":eq(" + (index === 0 ? length - 1 : index - 1) + "), :eq(" + (index === length - 1 ? 0 : index + 1) + ")";
    },

    _position: function (img) {
    },

    _calculateSize: function (content) {
      var width, height;
      $.swap($(content).appendTo('<div>').appendTo(document.body)[0], {
        position: "absolute",
        visibility: "hidden",
        display: "block"
      }, function () {
        width = $(this).width();
        height = $(this).height();
        $(this).remove();
      });
      return { width: width, height: height };
    },

    _resize: function (elem, width, height) {
      var viewer = this.lightbox,
        dialog = viewer.data('dialog'),
        offset = 20,

        // difference
        deltaContentWidth = viewer.outerWidth() - viewer.width(),
        deltaContentHeight = viewer.outerHeight() - viewer.height(),

        dialogTitlebarHeight = dialog.uiDialogTitlebar.outerHeight(),

        // Window
        wWidth = $(window).width(),
        wHeight = $(window).height(),

        size = {width: width, height: height},

        // Desired width
        finalWidth = size.width + deltaContentWidth,
        finalHeight = size.height + deltaContentHeight + dialogTitlebarHeight,

        ratio = Math.min(
          Math.min(
            Math.min(wWidth - deltaContentWidth - offset, size.width) / size.width,
            Math.min(wHeight - deltaContentHeight - dialogTitlebarHeight - offset, size.height) / size.height, 1));

      $.extend(size, {
        width: Math.round(ratio * size.width),
        height: Math.round(ratio * size.height)
      });

      elem.css(size);

      if (ratio !== 1) {
        elem.attr('width', '').attr('height', '');
      }

      finalWidth = size.width + deltaContentWidth;
      finalHeight = size.height + deltaContentHeight + dialogTitlebarHeight;

      return { width: finalWidth, height: finalHeight };
    },

    setCurrentAnchor: function (anchor) {
      this._setData('cursor', anchor);
    },

    getCurrentAnchor: function () {
      return this._getData('cursor');
    },

    _rotate: function (selectorA, selectorB, direction) {
      var self = this,
        anchors = this._anchors(),
        current = this.getCurrentAnchor(),
        target = this.getCurrentAnchor(),
        viewer = this.lightbox,
        dialog = viewer.data('dialog').uiDialog,

        effectOut = {
          direction: direction
        },
        effectIn = {
          direction: { up: "down", down: "up", left: "right", right: "left" }[direction]
        };

      if (anchors.length === 1) {
        return;
      }

      target = anchors.filter(selectorA + anchors.index(current) + ")" + selectorB)[0];
      if (!target && this.options.loop && anchors.length > 1) {
        target = anchors.filter(selectorB)[0];
      }

      dialog.hide(this.options.rotateOut, effectOut, this.options.duration, function () {
        viewer
          .unbind('dialogclose.lightbox')
          .bind('dialogclose.lightbox', self._rotateClose)
          .dialog('close')
          .unbind('dialogclose.lightbox');
        self.setCurrentAnchor(target);
        self._preloadNeighbours();
        $(this).show(self.options.rotateIn, effectIn, self.options.duration, function () {
          viewer
            .dialog('open')
            .unbind('dialogclose.lightbox')
            .bind('dialogclose.lightbox', self._dialogClose);
        });
      });
    },


    // Swappable dialog event handlers.

    _rotateClose: function (event, ui) {
      var lightbox = $(this).dialog('option', '_lightbox'),
        dialog = $(lightbox.lightbox).data('dialog');

      $(this).empty();
      $(dialog.uiDialog).hide();
    },

    _dialogClose: function (event, ui) {
      var self = this,
        lightbox = $(this).dialog('option', '_lightbox'),
        dialog = $(lightbox.lightbox).data('dialog'),

        thumb = $(lightbox.getCurrentAnchor()),
        offset = thumb.offset(),
        stop = {
          left: offset.left,
          top: offset.top,
          width: thumb.width(),
          height: thumb.height(),
          opacity: 0
        };

      $(dialog.uiDialog).hide('scale', { to: stop }, lightbox.options.duration, function () {
        $(self).empty().dialog('option', '_lightbox').close();
      });
    },

    _element: function (type, clazz) {
      return $("<" + type + "/>").addClass(clazz).hide();
    }
  });

  $.extend($.ui.lightbox, {
    defaults: {
      loop: true,
      modal: true,
      overlay: {},
      cache: true,
      post: 0,
      dialogClass: 'ui-lightbox',
      closeOnEscape: true,
      resizable: false,
      draggable: false,
      selector: "a[href]:has(img[src])",
      titleSuffix: "",
      position: 'center',
      width: 'auto',
      height: 'auto',
      parameters: {},
      duration: 1000,
      rotateIn: 'drop',
      rotateOut: 'drop',
      show: '',
      hide: ''
    },
    uuid: 0,
    overlay: function (dialog) {
      this.$el = $.ui.lightbox.overlay.create(dialog);
    },
    spinner: function (lightbox) {
      this.$el = $.ui.lightbox.spinner.create(lightbox);
    }
  });

  $.extend($.ui.lightbox.overlay, $.ui.dialog.overlay, {});

  $.extend($.ui.lightbox.overlay.prototype, $.ui.dialog.overlay.prototype, {
    destroy: function () {
      $.ui.lightbox.overlay.destroy(this.$el);
    }
  });

  $.extend($.ui.lightbox.spinner, {
    instances: [],
    create: function (lightbox) {
      if (this.instances.length === 0) {
        var $el = $('<div></div>').appendTo(document.body)
          .addClass('ui-loading-indicator ui-corner-all').fadeIn("slow");

        this.instances.push($el);
        return $el;
      }
    },
    destroy: function ($el) {
      this.instances.splice($.inArray(this.instances, $el), 1);

      $el.remove();
    }
  });

  $.extend($.ui.lightbox.spinner.prototype, {
    destroy: function () {
      $.ui.lightbox.spinner.destroy(this.$el);
    }
  });

})(jQuery);
