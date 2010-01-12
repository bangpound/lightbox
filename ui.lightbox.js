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
     */
    _init: function () {
      this.instances = [];

      var self = this;

      // todo: consider event delegation to make this more dynamic
      $(this.options.selector, this.element).bind('click.lightbox', function (event) {
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
            self.lightbox.dialog('close');
            event.preventDefault();
          }
          break;
        case $.ui.keyCode.LEFT:
          self.prev("right");
          event.preventDefault();
          break;
        case $.ui.keyCode.UP:
          self.prev("down");
          event.preventDefault();
          break;
        case $.ui.keyCode.RIGHT:
          self.next("left");
          event.preventDefault();
          break;
        case $.ui.keyCode.DOWN:
          self.next("up");
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

    _getDialog: function () {
      var instances = this.instances,
        dialog = {};
      if (instances.length) {
        dialog = instances.pop();
      }
      else {
        dialog = this._makeDialog();
      }
      return dialog.empty();
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
          width: 'auto',
          height: 'auto',
          dialogClass: this.options.dialogClass,
          resizable: this.options.resizable,
          draggable: this.options.draggable
          // TODO: Support overlay by implementing focus,dragstop,resizestop
        }),
        dialog = lightbox.data('dialog'),
        height = 0,
        width = 0,
        buttonPane = lightbox.data('dialog').uiDialogButtonPane;

      height = dialog.uiDialog.innerHeight();

      // Hide the title bar so its padding does not count in the extra width.
      $(dialog.uiDialogTitlebar).hide();
      width = dialog.uiDialog.innerWidth();
      $(dialog.uiDialogTitlebar).show();

      if (this._anchors().length > 1) {
        lightbox.dialog('option', 'buttons', this._buttons);
        $('button', buttonPane).each(function (index, domElement) {
          var value = $(domElement).text().toLowerCase();
          $(domElement).addClass('button-' + index + ' button-' + value);
        });
      }

      lightbox.dialog('option', {
        _lightbox: this,
        _lightboxExtraWidth: width,
        _lightboxExtraHeight: height
      }).bind('dialogclose.lightbox', this._dialogClose).bind('dialogopen.lightbox', this._dialogOpen);
      return lightbox;
    },

    _getData: function (key) {
      switch (key) {
      case 'content':
        return $(this.lightbox).html();

      case 'cursor':
        return $(this.options.cursor);

      default:
        return this.lightbox.dialog('option', key);
      }
    },

    _setData: function (key, value) {
      switch (key) {
      case 'content':
        if (!this.lightbox) {
          this.lightbox = this._getDialog();
        }
        else if (this.lightbox.dialog('isOpen')) {
          $(this.lightbox).dialog('close');
        }
        this.options.content = $(this.lightbox).append(value);
        this.lightbox.dialog('open')
          .unbind('.lightbox')
          .bind('dialogopen.lightbox', this._dialogOpen)
          .bind('dialogclose.lightbox', this._dialogClose);
        break;
      case 'cursor':
        this.options.cursor = value;
        $('.active', this).removeClass('active');
        $(value).addClass('active');
        break;
      default:
        this.lightbox.dialog(key, value);
      }

      $.widget.prototype._setData.apply(this, arguments);
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
      var instances = this.instances,
        lightbox = this.lightbox;

      (this.overlay && this.overlay.destroy());

      instances.push(lightbox);
      this._flushInstances();

      this._anchors().removeData('lightbox.content');

      this.element.removeData('lightbox');
      $("*", this.element).unbind('.lightbox');
    },

    _flushInstances: function () {
      var instances = this.instances;
      $.each(instances, function (index, instance) {
        instance.empty().data('dialog').uiDialog.stop(true);
        instance.dialog('destroy').remove();
      });
    },

    open: function (anchor) {
      var viewer = (this.lightbox = this._getDialog());

      this.overlay = this.options.modal ? new $.ui.lightbox.overlay(viewer.data('dialog')) : null;
      this._setData('cursor', anchor);

      this._loadContent(anchor);

      // The ui.dialog widget has a reference to the ui.lightbox widget that
      // opened it in the dialog's options._lightbox property.
    },

    close: function () {
      var viewer = this.lightbox,
        instances = this.instances;

      (this.overlay && this.overlay.destroy());

      $.ui.lightbox.overlay.resize();

      instances.push(viewer);
      this._flushInstances();
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

    _loadContent: function (anchor) {
      var self = this,
        type = this.options.type ? this.options.type : this._deriveType(anchor);

      if (!this.spinner) {
        this.spinner = new $.ui.lightbox.spinner(this);
      }

      switch (type) {
      case "image":
        $('<img/>').attr('src', anchor.href).load(function (eventObject) {
          self._setData('content', $(this));
        });
        break;
      case "flash":
      case "flashvideo":
      case "quicktime":
      case "realplayer":
      case "windowsmedia":
        $(anchor).clone().appendTo(document.body).media({
          width: this.options.width,
          height: this.options.height,
          src: anchor.href,
          autoplay: 1
        }, function (element, options) {
        }, function (element, data, options, playerName) {
          self._setData('content', $(data));
        }).remove();
        break;
      case "iframe":
        this._setData('content', $('<iframe/>').attr('src', anchor.href).attr('frameborder', 0).attr('border', 0));
        break;
      case "html":
      case "dom":
        this._setData('content', $($(anchor).attr('href')).clone());
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
            self._setData('content', $(data));
          }
        });
        break;
      }

      this.spinner.destroy();
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

    // Sizing functions

    _actualContentSize: function (content) {
      var width, height;
      $.swap($('<div/>').append(content.clone()).appendTo(document.body)[0], {
        position: "absolute",
        visibility: "hidden",
        display: "block"
      }, function () {
        width = $(this).outerWidth();
        height = $(this).outerHeight();
        $(this).remove();
      });
      return { width: width, height: height };
    },

    _constrainContentSize: function (content, constraint, dimension) {
      $(content).css(dimension, $(constraint, content).attr(dimension));
      return this._actualContentSize(content);
    },

    _idealContentSize: function (size) {
      var wWidth = $(window).width(),
        wHeight = $(window).height(),
        lightbox = this.lightbox,
        tbMargin = lightbox.dialog('option', '_lightboxExtraWidth'),
        lrMargin = lightbox.dialog('option', '_lightboxExtraHeight'),
        ratio = 1;

      // Window real estate is taken by dialog chrome.
      // todo: set up offset option.
      wWidth = wWidth - tbMargin - this.options.margin;
      wHeight = wHeight - lrMargin - this.options.margin;

      ratio = Math.min(
        Math.min(
          Math.min(wWidth, size.width) / size.width,
          Math.min(wHeight, size.height) / size.height, 1));

      return {
        width: Math.round(ratio * size.width),
        height: Math.round(ratio * size.height)
      };
    },

    _rotate: function (selectorA, selectorB, direction) {
      var anchors = this._anchors(),
        current = this.options.cursor,
        target = this.options.cursor,
        viewer = this.lightbox,
        newViewer = this._getDialog();

      if (anchors.length === 1) {
        return;
      }

      target = anchors.filter(selectorA + anchors.index(current) + ")" + selectorB)[0];
      if (!target && this.options.loop && anchors.length > 1) {
        target = anchors.filter(selectorB)[0];
      }

      viewer
        .unbind('dialogclose.lightbox')
        .bind('dialogclose.lightbox', { direction: direction }, this._rotateClose)
        .dialog('close');

      this.lightbox = newViewer;

      newViewer
        .unbind('dialogopen.lightbox')
        .bind('dialogopen.lightbox', { direction: direction }, this._rotateOpen);

      this._setData('cursor', target);
      this._loadContent(target);
    },

    // Swappable dialog event handlers.

    _rotateOpen: function (event, ui) {
      var lightbox = $(this).dialog('option', '_lightbox'),
        options = lightbox.options,
        dialog = $(this).data('dialog'),
        content = $(this).children(),
        size = { width: options.width, height: options.height },
        direction = { up: "down", down: "up", left: "right", right: "left" }[event.data.direction],
        lightboxStyle = {};

      if (size.width === 'auto' && size.height === 'auto') {
        size = lightbox._idealContentSize(lightbox._actualContentSize(content));
        content.css(size);
      }
      else if (size.width === 'constrain' || size.height === 'constrain') {
        $.each(size, function (i, val) {
          if (val === 'constrain') {
            size = lightbox._constrainContentSize(content, options.constraint, i);
          }
        });
      }

      if (options.modal) {
        lightboxStyle.position = 'fixed';
      }
      $.extend(lightboxStyle, lightbox._lightboxStyle(dialog, size));

      $(dialog.uiDialog).css(lightboxStyle).show(options.rotateIn, { direction: direction }, options.duration);
    },

    _rotateClose: function (event, ui) {
      var self = this,
        lightbox = $(this).dialog('option', '_lightbox'),
        options = lightbox.options,
        direction = event.data.direction,
        dialog = $(this).data('dialog');

      $(dialog.uiDialog).hide(options.rotateOut, { direction: direction }, options.duration, function () {
        lightbox.instances.push($(self));
      });
    },

    _dialogOpen: function (event, ui) {
      var lightbox = $(this).dialog('option', '_lightbox'),
        options = lightbox.options,
        content = $(this).children(),
        size = { width: options.width, height: options.height },
        dialog = $(this).data('dialog'),
        anchorStyle = lightbox._anchorStyle(options.cursor),
        lightboxStyle = {};

      if (size.width === 'auto' && size.height === 'auto') {
        size = lightbox._idealContentSize(lightbox._actualContentSize(content));
      }
      else if (size.width === 'constrain' || size.height === 'constrain') {
        $.each(size, function (i, val) {
          if (val === 'constrain') {
            size = lightbox._constrainContentSize(content, options.constraint, i);
          }
        });
      }

      if (options.modal) {
        lightboxStyle.position = 'fixed';
      }
      $.extend(lightboxStyle, lightbox._lightboxStyle(dialog, size));

      content.effect('size', { from: { width: anchorStyle.width, height: anchorStyle.height }, to: size }, options.duration);

      $(dialog.uiDialog).css(anchorStyle).show().animate(lightboxStyle, options.duration);
    },

    _dialogClose: function (event, ui) {
      var self = this,
        lightbox = $(this).dialog('option', '_lightbox'),
        options = lightbox.options,
        content = $(this).children(),
        dialog = $(this).data('dialog'),
        anchorStyle = lightbox._anchorStyle(options.cursor);

      content.effect('size', { to: { width: anchorStyle.width, height: anchorStyle.height } }, options.duration);

      $(dialog.uiDialog).animate(anchorStyle, options.duration, function () {
        $(this).hide();
        lightbox.close();
      });
    },

    _anchorStyle: function (anchor) {
      var offset = {},
        size = {};

      $.swap(anchor, { display: 'block' }, function () {
        offset = $(this).offset();
        size.height = $(this).outerHeight();
        size.width = $(this).outerWidth();
      });

      return $.extend({ opacity: 0 }, size, offset);
    },

    _lightboxStyle: function (dialog, size) {
      var content = dialog.element,
        margin = {
          height: (parseInt(content.css('margin-top'), 10) || 0) + (parseInt(content.css('margin-bottom'), 10) || 0),
          width: (parseInt(content.css('margin-left'), 10) || 0) + (parseInt(content.css('margin-right'), 10) || 0)
        },
        chrome = {
          height: dialog.options._lightboxExtraHeight,
          width: dialog.options._lightboxExtraWidth
        },
        position = '';

      $.each(size, function (i, val) {
        if (parseInt(val, 10) > 0) {
          size[i] += margin[i] + chrome[i];
        }
      });

      position = this._position(size, this.options.position);

      return $.extend({ opacity: 1 }, size, position);
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

      // Width/height is the size of the content.
      // Allowed values for width, height:
      // 'auto' = if contents have width or height, the lightbox will size
      //   to fit.
      // 'constrain' = when the 'constraint' option is also set, the element
      //   selected by 'constraint' in the content will determine the width or
      //   height.
      //  6px,1em, 50% = normal CSS style.
      width: 'auto',
      height: 'auto',
      constraint: '',

      parameters: {},
      duration: 400,
      rotateIn: 'drop',
      rotateOut: 'drop',
      show: 'scale',
      hide: 'scale',
      margin: 100
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
        var $el = $('<div/>').appendTo(document.body)
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
