/*globals window,jQuery */
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
      var self = this;
      this.dialogOptions = $.extend({}, $.ui.dialog.defaults, {
        // autoOpen always has to be false because the widget's expando
        // doesn't exist until it has been instantiated.
        autoOpen: false,
        autoResize: true,
        closeOnEscape: this.options.closeOnEscape,
        modal: false,
        show: 'lightboxDialog',
        hide: 'lightboxDialog',
        width: 'auto',
        height: 'auto',
        dialogClass: this.options.dialogClass,
        resizable: this.options.resizable,
        draggable: this.options.draggable
        // TODO: Support overlay by implementing focus,dragstop,resizestop
      });

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
          self.close();
          event.preventDefault();
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

    _makeDialog: function (cursor) {
      var viewer = $('<div/>').dialog($.extend(this.dialogOptions)),
        buttonPane = viewer.data('dialog').uiDialogButtonPane;

      viewer
        .bind('dialogopen.lightbox', { anchor: cursor, lightbox: this }, this._dialogOpen)
        .bind('dialogclose.lightbox', { anchor: cursor, lightbox: this }, this._dialogClose);


      if (this._anchors().length > 1) {
        viewer.dialog('option', 'buttons', this._buttons());
        $('button', buttonPane).each(function (index, domElement) {
          var value = $(domElement).text().toLowerCase();
          $(domElement).addClass('button-' + index + ' button-' + value);
        });
      }

      return viewer;
    },

    _display: function (anchor) {
      var content = $(anchor).data('lightbox.content');

      this.options.cursor = anchor;
      this.lightbox.append(content);
      this.lightbox.dialog('open');

      (this.spinner && this.spinner.destroy());

    },

    _setData: function (key, value) {
      if (key === 'cursor') {
        this.options.cursor = value;
        $('.active', this).removeClass('active');
        $(value).addClass('active');
      }
      else {
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

    _buttons: function () {
      var lightbox = this;
      return {
        'Previous': function (eventObject) {
          lightbox.prev("right");
        },
        'Next': function (eventObject) {
          lightbox.next("left");
        }
      };
    },

    destroy: function () {
      (this.overlay && this.overlay.destroy());

      this._anchors()
        .removeData('lightbox.content')
        .removeData('lightbox.anchorStyle')
        .removeData('lightbox.lightboxStyle');

      this.element.removeData('lightbox');
      $("*", this.element).unbind('.lightbox');
    },

    open: function (anchor) {
      this.lightbox = this._makeDialog(anchor);
      this.overlay = this.options.modal ? new $.ui.lightbox.overlay(this) : null;
      this._setData('cursor', anchor);
      this._loadContent(anchor);
    },

    close: function () {
      (this.overlay && this.overlay.destroy());
      $.ui.lightbox.overlay.resize();
      this.lightbox.dialog('close');
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
        type = this.options.type ? this.options.type : this._deriveType(anchor),
        content = $(anchor).data('lightbox.content');

      this.spinner = new $.ui.lightbox.spinner(this);

      if (!content) {
        switch (type) {
        case "image":
          $('<img/>').attr('src', anchor.href).load(function (eventObject) {
            $(anchor).data('lightbox.content', this);
            self._display(anchor);
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
            $(anchor).data('lightbox.content', data);
            self._display(anchor);
          }).remove();
          break;
        case "iframe":
          $(anchor).data('lightbox.content', $('<iframe/>').attr('src', anchor.href).attr('frameborder', 0).attr('border', 0));
          self._display(anchor);
          break;
        case "html":
        case "dom":
          $(anchor).data('lightbox.content', $($(anchor).attr('href')).clone());
          self._display(anchor);
          break;
        case "ajax":
        case "script":
          $.ajax({
            url: anchor.href,
            type: (parseInt(self.options.post, 10) === 1) ? "POST" : "GET",
            cache: true,
            async: true,
            data: self.options.parameters,
            dataType: (type === "ajax") ? "html" : "script",
            success: function (data, textStatus) {
              $(anchor).data('lightbox.content', data);
              self._display(anchor);
            }
          });
          break;
        }

      }
      else {
        this._display(anchor);
      }
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
        ratio = 1;

      // Window real estate is taken by dialog chrome.
      // todo: set up offset option.
      wWidth = wWidth - this.options.margin;
      wHeight = wHeight - this.options.margin;

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
        viewer = this.lightbox;

      if (anchors.length === 1) {
        return;
      }

      target = anchors.filter(selectorA + anchors.index(current) + ")" + selectorB)[0];
      if (!target && this.options.loop && anchors.length > 1) {
        target = anchors.filter(selectorB)[0];
      }

      viewer
        .unbind('dialogclose.lightbox')
        .bind('dialogclose.lightbox', {
          lightbox: this,
          anchor: current,
          direction: direction
        }, this._rotateClose)
        .dialog('close');

      viewer = this.lightbox = this._makeDialog(target);
      viewer
        .unbind('dialogopen.lightbox')
        .bind('dialogopen.lightbox', {
          lightbox: this,
          anchor: target,
          direction: direction
        }, this._rotateOpen);

      this._setData('cursor', target);
      this._loadContent(target);
    },

    // Swappable dialog event handlers.

    _rotateOpen: function (event, ui) {
      var lightbox = event.data.lightbox,
        anchor = event.data.anchor,
        direction = event.data.direction,
        options = lightbox.options,
        dialog = $(this).data('dialog'),
        content = $(this).children(),
        lightboxStyle = lightbox._lightboxStyle(this, anchor);

      direction = { up: "down", down: "up", left: "right", right: "left" }[direction];

      if (options.resizeContent === true) {
        content.css({ width: lightboxStyle.width, height: lightboxStyle.height });
      }

      dialog.uiDialog.css(lightboxStyle).show(options.rotateIn, { direction: direction }, options.duration);
    },

    _rotateClose: function (event, ui) {
      var lightbox = event.data.lightbox,
        direction = event.data.direction,
        options = lightbox.options,
        dialog = $(this).data('dialog'),
        content = dialog.element;

      dialog.uiDialog.hide(options.rotateOut, { direction: direction }, options.duration, function () {
        content.remove();
      });
    },

    _dialogOpen: function (event, ui) {
      var anchor = event.data.anchor,
        lightbox = event.data.lightbox,
        options = lightbox.options,
        dialog = $(this).data('dialog'),
        anchorStyle = lightbox._anchorStyle(anchor),
        content = $(this).children(),
        lightboxStyle = lightbox._lightboxStyle(this, anchor);

      if (options.resizeContent === true) {
        content.effect('size', { from: { width: anchorStyle.width, height: anchorStyle.height }, to: { width: lightboxStyle.width, height: lightboxStyle.height } }, options.duration);
      }
      $(dialog.uiDialog).css(anchorStyle).show().queue('fx', function () {
        $(this).animate(lightboxStyle, lightbox.options.duration).dequeue('fx');
      });
    },

    _dialogClose: function (event, ui) {
      var lightbox = event.data.lightbox,
        anchor = event.data.anchor,
        options = lightbox.options,
        dialog = $(this).data('dialog'),
        content = dialog.element,
        anchorStyle = lightbox._anchorStyle(anchor);

      content.effect('size', { to: { width: anchorStyle.width, height: anchorStyle.height } }, options.duration);

      dialog.uiDialog.animate(anchorStyle, options.duration, function () {
        content.remove();
      });
    },

    _anchorStyle: function (anchor) {
      var offset = {},
        size = {},
        style = $(anchor).data('lightbox.anchorStyle');

      if (!style) {
        $.swap(anchor, { display: 'block' }, function () {
          offset = $(this).offset();
          size.height = $(this).outerHeight();
          size.width = $(this).outerWidth();
        });
        style = $.extend({ opacity: 0 }, size, offset);
        $(anchor).data('lightbox.anchorStyle', style);
      }

      return style;
    },

    _lightboxStyle: function (element, anchor) {
      var lightbox = this,
        content = $(element).children(),
        dialog = $(element).data('dialog'),
        options = lightbox.options,
        size = { width: options.width, height: options.height },
        contentSize = this._actualContentSize(content),
        margin = {
          height: (parseInt(content.css('margin-top'), 10) || 0) + (parseInt(content.css('margin-bottom'), 10) || 0),
          width: (parseInt(content.css('margin-left'), 10) || 0) + (parseInt(content.css('margin-right'), 10) || 0)
        },
        chrome = this._dialogChrome(dialog),
        position = {},
        style = $(anchor).data('lightbox.lightboxStyle');

      if (!style) {
        if (size.width === 'auto' && size.height === 'auto') {
          size = this._idealContentSize(contentSize);
        }
        else if (size.width === 'constrain' || size.height === 'constrain') {
          $.each(size, function (i, val) {
            if (val === 'constrain') {
              size = lightbox._constrainContentSize(content, options.constraint, i);
            }
          });
        }

        $.each(size, function (i, val) {
          if (parseInt(val, 10) > 0) {
            size[i] += margin[i] + chrome[i];
          }
        });

        position = this._position(size, this.options.position);
        style = $.extend({ opacity: 1 }, size, position);
        if (options.modal) {
          style.position = 'fixed';
        }
        $(anchor).data('lightbox.lightboxStyle', style);
      }

      return style;
    },

    _dialogChrome: function (dialog) {
      var size = {};

      // Hide the title bar so its padding does not count in the extra width.
      dialog.uiDialogTitlebar.hide();
      size.width = dialog.uiDialog.innerWidth();
      dialog.uiDialogTitlebar.show();
      size.height = dialog.uiDialog.innerHeight();

      return size;
    }

  });

  $.extend($.ui.lightbox, {
    defaults: {
      loop: true,
      modal: true,
      overlay: {},
      selector: "a[href]:has(img[src])",

      dialogClass: 'ui-lightbox',
      closeOnEscape: true,
      resizable: false,
      draggable: false,
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
      resizeContent: true,

      post: 0,
      parameters: {},

      // Transition effects and animation options.
      rotateIn: 'drop',
      rotateOut: 'drop',
      show: 'scale',
      hide: 'scale',
      duration: 400,

      margin: 100
    },
    uuid: 0,
    overlay: function (lightbox) {
      this.$el = $.ui.lightbox.overlay.create(lightbox);
    },
    spinner: function (lightbox) {
      this.$el = $.ui.lightbox.spinner.create(lightbox);
    }
  });

  /**
   * Overlay
   */
  $.extend($.ui.lightbox.overlay, $.ui.dialog.overlay, {
    create: function (lightbox) {
      if (this.instances.length === 0) {
        setTimeout(function () {
          $('a, :input').bind($.ui.lightbox.overlay.events, function () {
            var allow = false,
              $dialog = $(this.lightbox).parents('.ui-dialog'),
              $overlays = {},
              maxZ = 0;

            if ($dialog.length) {
              $overlays = $('.ui-dialog-overlay');
              if ($overlays.length) {
                maxZ = parseInt($overlays.css('z-index'), 10);
                $overlays.each(function () {
                  maxZ = Math.max(maxZ, parseInt($(this).css('z-index'), 10));
                });
                allow = parseInt($dialog.css('z-index'), 10) > maxZ;
              } else {
                allow = true;
              }
            }
            return allow;
          });
        }, 1);

        // allow closing by pressing the escape key
        $(document).bind('keydown.dialog-overlay', function (event) {
          (lightbox.options.closeOnEscape && event.keyCode && event.keyCode === $.ui.keyCode.ESCAPE && lightbox.close());
        });

        // handle window resize
        $(window).bind('resize.dialog-overlay', $.ui.lightbox.overlay.resize);
      }

      var $el = $('<div/>').appendTo(document.body)
        .addClass('ui-dialog-overlay').css($.extend({
          borderWidth: 0,
          margin: 0,
          padding: 0,
          position: 'absolute',
          top: 0,
          left: 0,
          width: this.width(),
          height: this.height()
        }, lightbox.options.overlay));

      (lightbox.options.bgiframe && $.fn.bgiframe && $el.bgiframe());

      this.instances.push($el);
      return $el;
    }
  });

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
