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

  /**
   * Lightbox
   */
  $.widget('ui.lightbox', {
    /**
     * Moving parts of jQuery UI Lightbox widget.
     *
     * lightbox = the widget object = this.element.data('lightbox')
     *
     *
     * viewer = this.lightbox = the DOM element.
     * dialog = this.lightbox.data('dialog')
     *   dialog.uiDialog = the outermost div element of a ui.dialog widget.
     *   dialog.uiDialogButtonPane = the container for the buttons.
     *
     * anchors = _anchors() = anchors in this lightbox collection.
     * cursor = this.options.cursor = active item in lightbox.
     * anchorData = $(anchor).data('lightbox') = cache.
     */
    _init: function () {
      var self = this;

      // todo: consider event delegation to make this more dynamic
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
              .dialog('close');
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
      // Using &nbsp; adds unwanted width and height to the calculation.
      var lightbox = $('<div/>').dialog({
        autoOpen: false,
        autoResize: false,
        closeOnEscape: false,
        modal: false,
        show: 'lightboxDialog',
        hide: 'lightboxDialog',
        width: this.options.width,
        height: this.options.height,
        dialogClass: this.options.dialogClass,
        resizable: this.options.resizable,
        draggable: this.options.draggable
        // TODO: Support overlay by implementing focus,dragstop,resizestop
      }),
        dialog = lightbox.data('dialog'),
        height = dialog.uiDialog.innerHeight(),
        width = dialog.uiDialog.innerWidth();

      lightbox.dialog('option', {
        _lightbox: this,
        _lightboxExtraWidth: width,
        _lightboxExtraHeight: height
      });
      return lightbox.empty();
    },

    _calculateOffset: function (anchor) {
      var offset;
      $.swap(anchor, { display: 'block' }, function () {
        offset = $(this).offset();
      });
      return offset;
    },

    _resizeContent: function () {
      var content = this.content,
        contentSize = this._actualContentSize(this.content),
        size = this._idealContentSize(contentSize.width, contentSize.height);

      content.effect('size', { to: size }, this.options.duration);
    },

    _position: function (size, pos) {
      var wnd = $(window),
        doc = $(document),
        pTop = doc.scrollTop(),
        pLeft = doc.scrollLeft(),
        minTop = pTop;

      if ($.inArray(pos, ['center', 'top', 'right', 'bottom', 'left']) >= 0) {
        pos = [
          pos === 'right' || pos === 'left' ? pos : 'center',
          pos === 'top' || pos === 'bottom' ? pos : 'middle'
        ];
      }
      if (pos.constructor !== Array) {
        pos = ['center', 'middle'];
      }
      if (pos[0].constructor === Number) {
        pLeft += pos[0];
      } else {
        switch (pos[0]) {
        case 'left':
          pLeft += 0;
          break;
        case 'right':
          pLeft += wnd.width() - size.width;
          break;
        default:
        case 'center':
          pLeft += (wnd.width() - size.width) / 2;
        }
      }
      if (pos[1].constructor === Number) {
        pTop += pos[1];
      } else {
        switch (pos[1]) {
        case 'top':
          pTop += 0;
          break;
        case 'bottom':
          // Opera check fixes #3564, can go away with jQuery 1.3
          pTop += ($.browser.opera ? window.innerHeight : wnd.height()) - size.height;
          break;
        default:
        case 'middle':
          // Opera check fixes #3564, can go away with jQuery 1.3
          pTop += (($.browser.opera ? window.innerHeight : wnd.height()) - size.height) / 2;
        }
      }

      // prevent the dialog from being too high (make sure the titlebar
      // is accessible)
      pTop = Math.max(pTop, minTop);

      return {top: pTop, left: pLeft};
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
      var viewer = (this.lightbox = this._makeDialog()),
        buttonPane = viewer.data('dialog').uiDialogButtonPane;

      this.overlay = this.options.modal ? new $.ui.lightbox.overlay(viewer.data('dialog')) : null;
      this._setData('cursor', anchor);

      viewer.dialog('option', 'buttons', this._buttons)
        .unbind('dialogclose.lightbox')
        .bind('dialogclose.lightbox', this._dialogClose)
        .bind('dialogopen.lightbox', this._dialogOpen)
        .dialog('open');

      this._setupButtons(buttonPane);

      // The ui.dialog widget has a reference to the ui.lightbox widget that
      // opened it in the dialog's options._lightbox property.
      this._preloadNeighbours();
    },

    _setupButtons: function (pane) {
      $('button', pane).each(function (index, domElement) {
        var value = $(domElement).text().toLowerCase();
        $(domElement).addClass('button-' + index + ' button-' + value);
      });
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
      var anchor = this.options.cursor,
        viewer = this.lightbox;

      this.content = $(content).appendTo(viewer);

      viewer.dialog('option', 'title', $(anchor).attr('title') + this.options.titleSuffix);
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
        anchorData.content = $('<img/>').attr('src', anchor.href).load(function (eventObject) {

        });
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
          anchorData.content = $(data);
          $(data).media('undo');
        });
        break;
      case "iframe":
        anchorData.content = $('<iframe/>').attr('src', anchor.href).attr('frameborder', 0).attr('border', 0);
        break;
      case "html":
      case "dom":
        anchorData.content = $(anchor).attr('href');
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
            anchorData.content = $(data);
          }
        });
        break;
      }

      if (this.options.cache) {
        $(anchor).data('lightbox', anchorData);
      }

      return anchorData.content;
    },

    // todo: find better way to guess media type from filename.
    _deriveType: function (anchor) {
      var reference = anchor.href.toLowerCase();
      if (reference.match(/\.(gif|jpg|jpeg|png)(\?[0123456789]+)?$/)) {
        return "image";
      }
      if (reference.match(/\.(swf)(\?[0123456789]+)?$/)) {
        return "flash";
      }
      if (reference.match(/\.(flv)(\?[0123456789]+)?$/)) {
        return "flashvideo";
      }
      if (reference.match(/\.(aif|aiff|aac|au|bmp|gsm|mov|mid|midi|mpg|mpeg|m4a|m4v|mp4|psd|qt|qtif|qif|qti|snd|tif|tiff|wav|3g2|3gp|wbmp)(\?[0123456789]+)?$/)) {
        return "quicktime";
      }
      if (reference.match(/\.(ra|ram|rm|rpm|rv|smi|smil)(\?[0123456789]+)?$/)) {
        return "realplayer";
      }
      if (reference.match(/\.(asf|avi|wma|wmv)(\?[0123456789]+)?$/)) {
        return "windowsmedia";
      }
      return "ajax";
    },

    _preloadNeighbours: function () {
      var anchors = this._anchors(),
        index = anchors.index(this.options.cursor),
        self = this;
      anchors.filter(this._neighbours(index, anchors.length)).each(function () {
        self._loadContent(this);
      });
    },

    _neighbours: function (index, length) {
      return ":eq(" + (index === 0 ? length - 1 : index - 1) + "), :eq(" + (index === length - 1 ? 0 : index + 1) + ")";
    },

    // Sizing functions

    _actualContentSize: function (content) {
      var width, height;
      $.swap($(content).clone().appendTo('<div>').appendTo(document.body)[0], {
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

    _idealContentSize: function (width, height) {
      var wWidth = $(window).width(),
        wHeight = $(window).height(),
        lightbox = this.lightbox,
        tbMargin = lightbox.dialog('option', '_lightboxExtraWidth'),
        lrMargin = lightbox.dialog('option', '_lightboxExtraHeight'),
        ratio = 1;

      // Window real estate is taken by dialog chrome.
      // todo: set up offset option.
      wWidth = wWidth - tbMargin - 20;
      wHeight = wHeight - lrMargin - 20;

      ratio = Math.min(
        Math.min(
          Math.min(wWidth, width) / width,
          Math.min(wHeight, height) / height, 1));

      return {
        width: Math.round(ratio * width),
        height: Math.round(ratio * height)
      };
    },

    _rotate: function (selectorA, selectorB, direction) {
      var self = this,
        anchors = this._anchors(),
        current = this.options.cursor,
        target = this.options.cursor,
        viewer = this.lightbox,
        dialog = viewer.data('dialog'),

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

      $(dialog.uiDialog).hide(this.options.rotateOut, effectOut, this.options.duration, function () {
        viewer
          .unbind('dialogopen.lightbox')
          .unbind('dialogclose.lightbox')
          .bind('dialogopen.lightbox', self._rotateOpen)
          .bind('dialogclose.lightbox', self._rotateClose)
          .dialog('close');
        self._setData('cursor', target);
        self._preloadNeighbours();
        $(this).show(self.options.rotateIn, effectIn, self.options.duration, function () {
          viewer
            .dialog('open')
            .unbind('dialogopen.lightbox')
            .unbind('dialogclose.lightbox')
            .bind('dialogopen.lightbox', self._dialogOpen)
            .bind('dialogclose.lightbox', self._dialogClose);
        });
      });
    },

    // Swappable dialog event handlers.

    _rotateOpen: function (event, ui) {
      var self = this,
        lightbox = $(this).dialog('option', '_lightbox'),
        contentSize = lightbox._actualContentSize(lightbox.content),
        size = lightbox._idealContentSize(contentSize.width, contentSize.height),
        tbMargin = $(this).dialog('option', '_lightboxExtraWidth'),
        lrMargin = $(this).dialog('option', '_lightboxExtraHeight'),
        titlebarHeight = $(this).data('dialog').uiDialogTitlebar.outerHeight(),
        buttonPaneHeight = $(this).data('dialog').uiDialogButtonPane.outerHeight();

      lightbox._resizeContent();

      $(this).effect('size', { to: size, scale: 'box' }, lightbox.options.duration, function () {
        $(self).css(size);
        $(self).dialog('option', {
          width: 'auto',
          height: $(self).outerHeight(true) + titlebarHeight + buttonPaneHeight,
          maxWidth: contentSize.width + lrMargin,
          maxHeight: contentSize.height + tbMargin
        });
      });
    },

    _rotateClose: function (event, ui) {
      var dialog = $(this).data('dialog');

      $(this).empty();
      $(dialog.uiDialog).hide();
    },

    _dialogOpen: function (event, ui) {
      var lightbox = $(this).dialog('option', '_lightbox'),
        contentSize = lightbox._actualContentSize(lightbox.content),
        size = lightbox._idealContentSize(contentSize.width, contentSize.height),
        dialog = $(this).data('dialog'),
        anchorStyle = lightbox._anchorStyle(lightbox.options.cursor),
        lightboxStyle = lightbox._lightboxStyle(dialog, contentSize);

      lightbox._resizeContent();

      $(dialog.uiDialog).css(anchorStyle).show().animate(lightboxStyle, lightbox.options.duration);
    },

    _dialogClose: function (event, ui) {
      var self = this,
        lightbox = $(this).dialog('option', '_lightbox'),
        dialog = $(this).data('dialog');

      $(dialog.uiDialog).animate(lightbox._anchorStyle(lightbox.options.cursor), lightbox.options.duration, function () {
        $(this).hide();
        $(self).empty();
        lightbox.close();
      });
    },

    _anchorStyle: function (anchor) {
      var thumb = $(anchor),
        offset = this._calculateOffset(anchor);

      return $.extend({ width: thumb.width(), height: thumb.height(), opacity: 0    }, offset);
    },

    _lightboxStyle: function (dialog, size) {
      var content = dialog.element,
        tbMargin = (parseInt(content.css('margin-top'), 10) || 0) + (parseInt(content.css('margin-bottom'), 10) || 0),
        lrMargin = (parseInt(content.css('margin-left'), 10) || 0) + (parseInt(content.css('margin-right'), 10) || 0),
        position = '';

      size = this._idealContentSize(size.width, size.height);

      size.height += tbMargin + dialog.options._lightboxExtraHeight;
      size.width += lrMargin + dialog.options._lightboxExtraWidth;

      position = this._position(size, this.options.position);

      return $.extend({ opacity: 1 }, size, position);
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
      duration: 400,
      rotateIn: 'drop',
      rotateOut: 'drop',
      show: 'scale',
      hide: 'scale'
    },
    uuid: 0,
    overlay: function (dialog) {
      this.$el = $.ui.lightbox.overlay.create(dialog);
    },
    spinner: function (lightbox) {
      this.$el = $.ui.lightbox.spinner.create(lightbox);
    }
  });

  /**
   * Overlay
   */
  $.extend($.ui.lightbox.overlay, $.ui.dialog.overlay, {});

  $.extend($.ui.lightbox.overlay.prototype, $.ui.dialog.overlay.prototype, {
    destroy: function () {
      $.ui.lightbox.overlay.destroy(this.$el);
    }
  });

  /**
   * Spinner
   */
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

  // This effect does nothing because the dialogopen and dialogclose event
  // trigger the effect.
  $.effects.lightboxDialog = function (o) {
    return $(this);
  };

}(jQuery));
