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
 * _lightbox = the widget object = this.element.data('lightbox')
 *
 *
 * viewer = this.$viewer = the DOM element.
 * _dialog = this.$viewer.data('dialog')
 *   _dialog.uiDialog = the outermost div element of a ui.dialog widget.
 *   _dialog.uiDialogButtonPane = the container for the buttons.
 *
 * $anchors = _anchors() = anchors in this lightbox collection.
 * cursor = this.options.cursor = active item in lightbox.
 */


/**
 * jQuery UI widget methods
 */

    _init: function () {
      var _lightbox;
      _lightbox = this;
      this.dialogOptions = $.extend({},
      $.ui.dialog.defaults, {
        // autoOpen always has to be false because the widget's expando
        // doesn't exist until it has been instantiated.
        autoOpen: false,
        autoResize: false,
        closeOnEscape: this.options.closeOnEscape,
        modal: false,
        // $.effects.lightboxDialog blocks ui.dialog's hide/show behavior.
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
        _lightbox.open(this);
      });

      $(document).keydown(function (event) {
        if (!_lightbox.$viewer || !_lightbox.$viewer.dialog('isOpen')) {
          return;
        }
        switch (event.keyCode) {
        case $.ui.keyCode.ESCAPE:
          _lightbox.close();
          event.preventDefault();
          break;
        case $.ui.keyCode.LEFT:
          _lightbox.prev("right");
          event.preventDefault();
          break;
        case $.ui.keyCode.UP:
          _lightbox.prev("down");
          event.preventDefault();
          break;
        case $.ui.keyCode.RIGHT:
          _lightbox.next("left");
          event.preventDefault();
          break;
        case $.ui.keyCode.DOWN:
          _lightbox.next("up");
          event.preventDefault();
          break;
        }
      });

      if ($.fn.mousewheel) {
        $(document).mousewheel(function (event, delta) {
          if (!_lightbox.$viewer.dialog('isOpen')) {
            return;
          }
          event.preventDefault();
          if (_lightbox.$viewer.is(":animated")) {
            return;
          }
          if (delta < 0) {
            _lightbox.next("down");
          }
          if (delta > 0) {
            _lightbox.prev("up");
          }
        });
      }
    },

    _setData: function (key, value) {
      if (key === 'cursor') {
        this.options.cursor = value;
        $('.active', this).removeClass('active');
        $(value).addClass('active');
      } else {
        this.$viewer.dialog(key, value);
      }
      $.widget.prototype._setData.apply(this, arguments);
    },

    destroy: function () {
      if (this.overlay) {
        this.overlay.destroy();
      }
      this._anchors().removeData('lightbox.content');
      this.element.removeData('lightbox');
      $("*", this.element).unbind('.lightbox');
    },


/**
 * ui.dialog integration
 */

    _makeDialog: function (cursor) {
      var $viewer, buttonPane, data;

      $viewer = $('<div/>').dialog($.extend(this.dialogOptions));
      buttonPane = $viewer.data('dialog').uiDialogButtonPane;
      data = {
        anchor: cursor,
        lightbox: this.element
      };

      $viewer
        .bind('dialogopen.lightbox', data, this._dialogOpen)
        .bind('dialogclose.lightbox', data, this._dialogClose);

      if (this._anchors().length > 1 && this.options.buttons) {
        $viewer.dialog('option', 'buttons', this._buttons());
        $('button', buttonPane).each(function (index, button) {
          var value;
          value = $(button).text().toLowerCase();
          $(button).addClass('button-' + index + ' button-' + value);
        });
      }

      return $viewer;
    },

    _display: function ($anchor) {
      var content;
      content = $anchor.data('lightbox.content');
      this._setData('cursor', $anchor[0]);
      this.$viewer.append(content);
      $(".ui-dialog-title", this.$viewer.data('dialog').uiDialogTitlebar).html(this.options.title);
      this.$viewer.dialog('open');
      if (this.spinner) {
        this.spinner.destroy();
      }

      $(window)
        .bind('resize.lightbox', {
          anchor: this.options.cursor,
          lightbox: this.element[0],
          dialog: this.$viewer[0]
        }, this._dialogResize);
    },

    _position: function (size, pos) {
      var wnd, doc, pTop, pLeft, minTop;
      wnd = $(window);
      doc = $(document);
      pTop = doc.scrollTop();
      pLeft = doc.scrollLeft();
      minTop = pTop;
      if ($.inArray(pos, ['center', 'top', 'right', 'bottom', 'left']) >= 0) {
        pos = [
          pos === 'right' || pos === 'left' ? pos : 'center', pos === 'top' || pos === 'bottom' ? pos : 'middle'
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
      return {
        top: pTop,
        left: pLeft
      };
    },

    _buttons: function () {
      var _lightbox;
      _lightbox = this;
      return {
        'Previous': function (eventObject) {
          _lightbox.prev("right");
        },
        'Next': function (eventObject) {
          _lightbox.next("left");
        }
      };
    },

    _rotate: function (selectorA, selectorB, direction) {
      var $anchors, current, target, $viewer, data;
      $anchors = this._anchors();
      current = this.options.cursor;
      target = this.options.cursor;
      $viewer = this.$viewer;

      data = {
        lightbox: this.element,
        direction: direction
      };

      if ($anchors.length === 1) {
        return;
      }

      target = $anchors.filter(selectorA + $anchors.index(current) + ")" + selectorB)[0];
      if (!target && this.options.loop && $anchors.length > 1) {
        target = $anchors.filter(selectorB)[0];
      }

      $viewer
        .unbind('dialogclose.lightbox')
        .bind('dialogclose.lightbox', $.extend({ anchor: current }, data), this._rotateClose)
        .dialog('close');

      $viewer = this.$viewer = this._makeDialog(target);
      $viewer
        .unbind('dialogopen.lightbox')
        .bind('dialogopen.lightbox', $.extend({ anchor: target }, data), this._rotateOpen);

      this._setData('cursor', target);
      this._loadContent($(target));
    },

/**
 * Lightbox public
 */

    open: function (anchor) {
      this.$viewer = this._makeDialog(anchor);
      this.overlay = this.options.modal ? new $.ui.lightbox.overlay(this) : null;
      this._setData('cursor', anchor);
      this._loadContent($(anchor));
    },

    close: function () {
      if (this.spinner) {
        this.spinner.destroy();
      }
      this.$viewer.dialog('close');
    },

    next: function (direction) {
      this._rotate(":gt(", ":first", direction || "up");
    },

    prev: function (direction) {
      this._rotate(":lt(", ":last", direction || "down");
    },


/**
 * Elements
 */

    _anchors: function () {
      // if deemed necessary, cache selection here
      return this.element.find(this.options.selector);
    },

    _loadContent: function ($anchor) {
      var _lightbox, type, content;
      _lightbox = this;
      type = this.options.type ? this.options.type : this._deriveType($anchor[0]);
      content = $anchor.data('lightbox.content');
      this.spinner = new $.ui.lightbox.spinner(this);
      if (!content) {
        switch (type) {
        case "image":
          $('<img/>').attr('src', $anchor[0].href).load(function (eventObject) {
            var width, height;
            $.swap(document.body.appendChild(this), {
              position: "absolute",
              visibility: "hidden",
              display: "block"
            }, function () {
              var $tmp = $(this);
              width = $tmp.outerWidth();
              height = $tmp.outerHeight();
            });
            this.width = width;
            this.height = height;
            $anchor.data('lightbox.content', this);
            _lightbox._display($anchor);
          });
          break;
        case "flash":
        case "flashvideo":
        case "quicktime":
        case "realplayer":
        case "windowsmedia":
          $anchor.clone().appendTo(document.body).media({
            width: this.options.width,
            height: this.options.height,
            src: $anchor[0].href,
            autoplay: 1
          },
          function (element, options) {},
          function (element, data, options, playerName) {
            $anchor.data('lightbox.content', data);
            _lightbox._display($anchor);
          }).remove();
          break;
        case "iframe":
          $anchor.data('lightbox.content', $('<iframe/>').attr('src', $anchor[0].href).attr('frameborder', 0).attr('border', 0)[0]);
          _lightbox._display($anchor);
          break;
        case "html":
        case "dom":
          $anchor.data('lightbox.content', $($anchor.attr('href')).clone().show());
          _lightbox._display($anchor);
          break;
        case "ajax":
        case "script":
          $.ajax({
            url: $anchor[0].href,
            type: (parseInt(_lightbox.options.post, 10) === 1) ? "POST" : "GET",
            cache: true,
            async: true,
            data: _lightbox.options.parameters,
            dataType: (type === "ajax") ? "html" : "script",
            success: function (data, textStatus) {
              $anchor.data('lightbox.content', data);
              _lightbox._display($anchor);
            }
          });
          break;
        }
      } else {
        this._display($anchor);
      }
    },

    // todo: find better way to guess media type from filename.
    _deriveType: function (anchor) {
      var reference;
      reference = anchor.href.toLowerCase();
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

/**
 * Sizing functions
 */

    _actualContentSize: function ($content) {
      var width, height;
      $.swap($('<div/>').append($content.clone()).appendTo(document.body)[0], {
        position: "absolute",
        visibility: "hidden",
        display: "block"
      },
      function () {
        var $tmp = $(this);
        width = $tmp.outerWidth();
        height = $tmp.outerHeight();
        $tmp.remove();
      });

      return {
        width: width,
        height: height
      };
    },

    _idealContentSize: function (size) {
      var wWidth, wHeight, ratio;
      wWidth = $(window).width();
      wHeight = $(window).height();
      ratio = 1;
      // Window real estate is taken by dialog chrome.
      wWidth = wWidth - this.options.margin;
      wHeight = wHeight - this.options.margin;
      ratio = Math.min(
      Math.min(
      Math.min(wWidth, size.width) / size.width, Math.min(wHeight, size.height) / size.height, 1));
      return {
        width: Math.round(ratio * size.width),
        height: Math.round(ratio * size.height)
      };
    },

/**
 * Swappable dialog event handlers.
 */

    _rotateOpen: function (event, ui) {
      var _lightbox, _dialog, $anchor, $content, $children, direction, options, contentStyle, lightboxStyle; // this = dialog element.

      _lightbox = $(event.data.lightbox).data('lightbox');
      _dialog = $(this).data('dialog');

      $anchor = $(event.data.anchor);
      $content = $(this);
      $children = $(this).children();

      direction = {
        up: "down",
        down: "up",
        left: "right",
        right: "left"
      }[event.data.direction];
      options = _lightbox.options;

      contentStyle = _lightbox._contentStyle($content);

      options.width = contentStyle.width;
      options.height = contentStyle.height;

      lightboxStyle = _lightbox._lightboxStyle(_dialog);

      $content.css(contentStyle);

      // todo: make the singleton tag an option.
      if ($children.length === 1 && $children[0].nodeName.match(/img/i)) {
        $children.css(contentStyle);
      }

      _dialog.uiDialog
        .css(lightboxStyle)
        .show(options.rotateIn, {
          direction: direction
        },
        options.duration);

    },

    _rotateClose: function (event, ui) {
      var _lightbox, _dialog, $content, direction, options;

      _lightbox = $(event.data.lightbox).data('lightbox');
      _dialog = $(this).data('dialog');

      $content = $(this);

      direction = event.data.direction;
      options = _lightbox.options;

      _dialog.uiDialog
        .hide(options.rotateOut, {
          direction: direction
        }, options.duration, function () {
          _dialog.element.remove();
        });

    },

    _dialogOpen: function (event, ui) {
      var _lightbox, _dialog, $anchor, $content, $children, options, anchorStyle, contentStyle, lightboxStyle;

      _lightbox = $(event.data.lightbox).data('lightbox');
      _dialog = $(this).data('dialog');

      $anchor = $(event.data.anchor);
      $content = $(this);
      $children = $(this).children();

      options = _lightbox.options;

      anchorStyle = _lightbox._anchorStyle($anchor);

      contentStyle = _lightbox._contentStyle($content);

      options.width = contentStyle.width;
      options.height = contentStyle.height;

      lightboxStyle = _lightbox._lightboxStyle(_dialog);

      $content.css(anchorStyle);

      // todo: make the singleton tag an option.
      if ($children.length === 1 && $children[0].nodeName.match(/img/i)) {
        $content
          .animate(contentStyle, options.duration);
        $children.effect('size', {
          from: {
            width: anchorStyle.width,
            height: anchorStyle.height
          },
          to: {
            width: contentStyle.width,
            height: contentStyle.height
          },
          scale: 'both'
        }, options.duration);
      }
      else {
        $content.css(contentStyle);
      }

      _dialog.uiDialog
        .css(anchorStyle)
        .animate(lightboxStyle, options.duration);

    },

    _dialogClose: function (event, ui) {
      var _lightbox, _dialog, $content, $children, $anchor, options, anchorStyle;

      _lightbox = $(event.data.lightbox).data('lightbox');
      _dialog = $(this).data('dialog');

      $anchor = $(event.data.anchor);
      $content = $(this);
      $children = $(this).children();

      options = _lightbox.options;

      anchorStyle = _lightbox._anchorStyle($anchor);

      // todo: make the singleton tag an option.
      if ($children.length === 1 && $children[0].nodeName.match(/img/i)) {
        $content
          .animate(anchorStyle, options.duration);
        $children.effect('size', {
          to: {
            width: anchorStyle.width,
            height: anchorStyle.height
          },
          scale: 'both'
        }, options.duration);
      }
      else {
        $content
          .show(options.show, {
            to: anchorStyle
          }, options.duration);
      }

      _dialog.uiDialog
        .animate(anchorStyle, options.duration, function () {
          if (_lightbox.overlay) {
            _lightbox.overlay.destroy();
          }
          $.ui.lightbox.overlay.resize();
          _dialog.element.remove();
        });

    },

    _dialogResize: function (event, ui) {
      var _lightbox, _dialog, $anchor, $content, options, contentStyle, lightboxStyle;


      _lightbox = $(event.data.lightbox).data('lightbox');
      _dialog = $(event.data.dialog || this).data('dialog');

      $anchor = $(event.data.anchor);
      $content = _dialog.element;

      options = _lightbox.options;

      contentStyle = _lightbox._contentStyle($content);

      options.width = contentStyle.width;
      options.height = contentStyle.height;

      lightboxStyle = _lightbox._lightboxStyle(_dialog);

      $content
        .animate(contentStyle);

      _dialog.uiDialog
        .animate(lightboxStyle);

    },

/**
 * Style generators
 */

    _anchorStyle: function ($anchor) {
      var offset, size, style;
      offset = {};
      size = {};
      style = {};
      $.swap($anchor[0], {
        display: 'block'
      },
      function () {
        var $tmp = $(this);
        offset = $tmp.offset();
        size.height = $tmp.outerHeight();
        size.width = $tmp.outerWidth();
      });
      style = $.extend({
        opacity: 0
      }, size, offset);
      return style;
    },

    _contentStyle: function ($content) {
      var options, length, size, margin, style;
      options = this.options;
      size = {
        width: options.width,
        height: options.height
      };
      margin = {
        height: (parseInt($content.css('margin-top'), 10) || 0) + (parseInt($content.css('margin-bottom'), 10) || 0),
        width: (parseInt($content.css('margin-left'), 10) || 0) + (parseInt($content.css('margin-right'), 10) || 0)
      };

      if (options.constrain) {
        length = $(options.measure, $content).css(options.constrain);
        size[options.constraint] = length;
      }
      if (size.width === 'auto' && size.height === 'auto') {
        size = this._actualContentSize($content);
        size = this._idealContentSize(size);
      }

      // add the margins to the calculated dimensions of content.
      $.each(size, function (i, val) {
        if (parseInt(val, 10) > 0) {
          size[i] += margin[i];
        }
      });

      style = $.extend({ opacity: 1 }, size);
      return style;
    },

    _lightboxStyle: function (_dialog) {
      var _lightbox, options, $container, $titlebar, size, chrome, position, style;

      _lightbox = this;

      options = _lightbox.options;

      $container = _dialog.uiDialogContainer;
      $titlebar = _dialog.uiDialogTitlebar;

      size = {
        width: options.width,
        height: options.height
      };
      chrome = {
        height: $titlebar.outerHeight(),
        width: 0
      };

      // add the padding of the dialog and buttons
      $.each(size, function (i, val) {
        if (parseInt(val, 10) > 0) {
          size[i] += chrome[i];
        }
      });

      position = this._position(size, options.position);

      style = $.extend({
          opacity: 1
        },
        size, position);
      if (options.modal) {
        style.position = 'fixed';
      }
      return style;
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
      title: "",
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

      // Constrain the width or height of lightbox by the length of that
      // dimension on the measured element.
      // { constrain: 'width', measure: 'img' }
      // would set the width of the lightbox to be the width of the lightbox
      // content's img element.
      constrain: '',
      measure: '',
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
    overlay: function (_lightbox) {
      this.$el = $.ui.lightbox.overlay.create(_lightbox);
    },
    spinner: function (_lightbox) {
      this.$el = $.ui.lightbox.spinner.create(_lightbox);
    }
  });


/**
 * Overlay
 */

  $.extend($.ui.lightbox.overlay, $.ui.dialog.overlay, {
    create: function (_lightbox) {
      if (this.instances.length === 0) {
        setTimeout(function () {
          $('a, :input').bind($.ui.lightbox.overlay.events, function () {
            var allow, $dialog, $overlays, maxZ;
            allow = false;
            $dialog = $(this).parents('.ui-dialog');
            $overlays = {};
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
        },
        1);
        // allow closing by pressing the escape key
        $(document).bind('keydown.dialog-overlay', function (event) {
          if (_lightbox.options.closeOnEscape && event.keyCode && event.keyCode === $.ui.keyCode.ESCAPE) {
            _lightbox.close();
          }
        });
        // handle window resize
        $(window).bind('resize.dialog-overlay', $.ui.lightbox.overlay.resize);
      }
      var $el;
      $el = $('<div/>').appendTo(document.body).addClass('ui-dialog-overlay').css($.extend({
        borderWidth: 0,
        margin: 0,
        padding: 0,
        position: 'absolute',
        top: 0,
        left: 0,
        width: this.width(),
        height: this.height()
      },
      _lightbox.options.overlay));
      if (_lightbox.options.bgiframe && $.fn.bgiframe) {
        $el.bgiframe();
      }
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
    create: function (_lightbox) {
      if (this.instances.length === 0) {
        var $el;
        $el = $('<div/>').appendTo(document.body).addClass('ui-loading-indicator ui-corner-all').fadeIn("slow");
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

/**
 * jQuery UI effect
 *
 * Nullifies any transition started by ui.dialog widgets.
 *
 */


  $.effects.lightboxDialog = function (o) {
    return $(this);
  };
}(jQuery));
