/*globals document,window,$,jQuery */
/*jslint white: true, onevar: true, undef: true, eqeqeq: true, plusplus: true, bitwise: true, regexp: true, strict: true, newcap: true, immed: true, indent: 2 */

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
          if (self.options.closeOnEscape) {
            self.close();
          }
          break;
        case $.ui.keyCode.LEFT:
          self.prev("left");
          event.preventDefault();
          break;
        case $.ui.keyCode.UP:
          self.prev("up");
          event.preventDefault();
          break;
        case $.ui.keyCode.RIGHT:
          self.next("right");
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
    },

    open: function (anchor) {
      var viewer = (this.lightbox = this._makeDialog());

      this.overlay = this.options.modal ? new $.ui.lightbox.overlay(viewer.data('dialog')) : null;
      this.setCurrentAnchor(anchor);

      viewer.dialog('option', 'buttons', this._buttons)
        .bind('dialogclose.lightbox', this._dialogClose)
        .dialog('open');

      viewer.dialog('option', '_lightbox', this);
    },

    close: function () {
      var self = this,
        anchor = this.getCurrentAnchor(),
        viewer = this.lightbox;

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
      switch (key) {
      case "cursor":
        this.options[key] = value;
        this.spinner = new $.ui.lightbox.spinner(this);
        this._display(this._loadContent(value));
        this.spinner.destroy();
        break;
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

    _loadContent: function (anchor) {
      var self = this,
        content = 'BUG',
        type = this.options.type ? this.options.type : this._deriveType(anchor);

      switch (type) {
      case "image":
        content = new Image();
        content.src = anchor.href;
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
          content = $(data).html();
          $(data).media('undo');
        });
        break;
      case "iframe":
        content = this._element('iframe').attr('src', anchor.href).attr('frameborder', 0).attr('border', 0).html();
        break;
      case "html":
      case "dom":
        var reference = $($(anchor).attr('href'));
        content = $('<div>').append(reference.clone().show()).remove().html();
        break;
      case "ajax":
      case "script":
        $.ajax({
          url: anchor.href,
          type: (parseInt(self.options.post, 10) === 1) ? "POST" : "GET",
          cache: true,
          async: false,
          data: self.options.parameters,
          dataType: (type === "ajax") ? "html" : "script",
          success: function (data, textStatus) {
            content = data;
          }
        });
        break;
      }

      return content;
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
        index = anchors.index(this.getCurrentAnchor());
      anchors.filter(this._neighbours(anchors.length, index)).each(function () {
        //new Image().src = this.href;
      });
    },

    _neighbours: function (index, length) {
      return ":eq(" + (index === 0 ? length - 1 : index - 1) + "), :eq(" + (index === length - 1 ? 0 : index + 1) + ")";
    },

    _position: function (img) {
    },

    _calculateSize: function (content) {
      var width,height;
      $.swap($(content).appendTo('<div>').appendTo(document.body)[0], {
        position: "absolute",
        visibility: "hidden",
        display: "block"
      }, function () {
        width = $(this).width(),
        height = $(this).height();
        $(this).remove();
      });
      return { width: width, height: height };
    },

    _resize: function (elem, width, height) {
      var viewer = this.lightbox,
        dialog = viewer.data('dialog'),
        offset = 20,
        finalWidth,finalHeight,

        // difference
        deltaContentWidth = viewer.outerWidth() - viewer.width(),
        deltaContentHeight = viewer.outerHeight() - viewer.height(),

        dialogTitlebarWidth = dialog.uiDialogTitlebar.outerWidth(),
        dialogTitlebarHeight = dialog.uiDialogTitlebar.outerHeight(),

        // Window
        wWidth = $(window).width(),
        wHeight = $(window).height(),

        size = {width: width, height: height};

      // Desired width
      finalWidth = size.width + deltaContentWidth,
      finalHeight = size.height + deltaContentHeight + dialogTitlebarHeight,

      ratio = Math.min(
        Math.min(
          Math.min(wWidth - deltaContentWidth - offset, size.width) / size.width,
          Math.min(wHeight - deltaContentHeight - dialogTitlebarHeight - offset, size.height) / size.height, 1)),


      $.extend(size, {
        width: Math.round(ratio * size.width),
        height: Math.round(ratio * size.height)
      });

      elem.css(size);

      return { width: size.width + deltaContentWidth, height: size.height + deltaContentHeight + dialogTitlebarHeight };
    },

    setCurrentAnchor: function (anchor) {
      this._setData('cursor', anchor);
    },

    getCurrentAnchor: function () {
      return this._getData('cursor');
    },

    _rotate: function (selectorA, selectorB, direction) {
      var self = this,
        content,
        anchors = this._anchors(),
        target = current = this.getCurrentAnchor(),
        viewer = this.lightbox,
        dialog = viewer.data('dialog').uiDialog,

        effectOut = {
          direction: direction
        },
        effectIn = {
          direction: {up:"down",down:"up",left:"right",right:"left"}[direction]
        };

      if (!this.getCurrentAnchor()) {
        console.log('Called _rotate without an anchor');
        return;
      }

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
          .bind('dialogclose.lightbox', self._rotateClose).dialog('close');
        self.setCurrentAnchor(target);
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
      $(this).empty();
    },

    _dialogClose: function (event, ui) {
      $(this).empty().dialog('option', '_lightbox').close();
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
    destroy: function() {
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
      };
    },
    destroy: function($el) {
      this.instances.splice($.inArray(this.instances, $el), 1);

      $el.remove();
    }
  });

  $.extend($.ui.lightbox.spinner.prototype, {
    destroy: function() {
      $.ui.lightbox.spinner.destroy(this.$el);
    }
  });

})(jQuery);
