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
        width: 'auto',
        height: 'auto',
        dialogClass: this.options.dialogClass,
        resizable: this.options.resizable,
        draggable: this.options.draggable
        // TODO: Support overlay by implementing focus,dragstop,resizestop
      });

      // Store original options for anchors.
      this.anchor_options = {
        type: this.options.type
      };

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
        $('.active', this).removeClass('active');
        $(value).addClass('active');
      }
      else {
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

    _makeDialog: function (content) {
      var $viewer, $content, _dialog, buttonPane;

      $content = $(content);

      if ($content.length === 1 && $content[0].nodeName.match(/div/i)) {
        $viewer = $content.dialog($.extend(this.dialogOptions));
      }
      else {
        $viewer = $('<div/>').append($content).dialog($.extend(this.dialogOptions));
      }

      _dialog = $viewer.data('dialog');

      _dialog.uiDialog.show = this.direction ? this._rotateOpen($viewer, this.direction) : this._dialogOpen($viewer);
      _dialog.uiDialog.hide = this._dialogClose($viewer);
//        .bind('resize', this._windowResizeStop($viewer));

      if (this._anchors().length > 1 && this.options.buttons) {
        buttonPane = $viewer.data('dialog').uiDialogButtonPane;
        $viewer.dialog('option', 'buttons', this._buttons());
        $('button', buttonPane).each(function (index, button) {
          var value;
          value = $(button).text().toLowerCase();
          $(button).addClass('button-' + index + ' button-' + value);
        });
      }

      return $viewer;
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
      var $anchors, current, target;
      $anchors = this._anchors();
      current = this.options.cursor;
      target = this.options.cursor;

      if ($anchors.length === 1) {
        return;
      }

      target = $anchors.filter(selectorA + $anchors.index(current) + ")" + selectorB)[0];
      if (!target && this.options.loop && $anchors.length > 1) {
        target = $anchors.filter(selectorB)[0];
      }

      this.select(target, direction);
    },

/**
 * Lightbox public
 */

    open: function (anchor) {
      this.overlay = this.options.modal ? new $.ui.lightbox.overlay(this) : null;
      this.select(anchor);
    },

    select: function (target, direction) {
      var options, current;

      this.spinner = new $.ui.lightbox.spinner(this);

      current = this.options.cursor;

      if (this.$viewer && this.$viewer.dialog('isOpen')) {
        if (direction) {
          this.$viewer.data('dialog').uiDialog.hide = this._rotateClose(this.$viewer, direction);
        }
        this.$viewer.dialog('close');
      }

      // check if options are cached.
      options = $(target).data('lightbox');
      if (!options) {
        // set up options.
        options = $.extend({}, this.anchor_options);
        if (!options.type) {
          options.type = this._deriveType(target);
        }
        $(target).data('lightbox', options);
      }
      options.cursor = target;

      this.option(options);
      this.direction = direction;

      $.ui.lightbox.linker[options.type].apply(this, [ $(target) ]);
    },

    display: function (content) {
      var options;

      if (this.spinner) {
        this.spinner.destroy();
      }

      options = this.options;

      this.$viewer = this._makeDialog(content);

      if (!options.draggable) {
        $(".ui-dialog-title", this.$viewer.data('dialog').uiDialogTitlebar).html(options.title);
      }
      this.$viewer.dialog('open');
    },

    close: function () {
      if (this.spinner) {
        this.spinner.destroy();
      }
      this.direction = '';
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

    // todo: find better way to guess media type from filename.
    _deriveType: function (anchor) {
      var reference;
      reference = anchor.href.toLowerCase();
      if (reference.match(/\.(gif|jpg|jpeg|png)(\?[0123456789]+)?$/)) {
        return "image";
      }
      if (reference.match(/\.(swf|flv|aif|aiff|aac|au|bmp|gsm|mov|mid|midi|mpg|mpeg|m4a|m4v|mp4|psd|qt|qtif|qif|qti|snd|tif|tiff|wav|3g2|3gp|wbmp|ra|ram|rm|rpm|rv|smi|smil|asf|avi|wma|wmv)(\?[0123456789]+)?$/)) {
        return "media";
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
        var $tmp;
        $tmp = $(this);
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

    _rotateOpen: function ($viewer, direction) {
      var lightbox, anchor;
      lightbox = this.element;
      anchor = this.options.cursor;

      return function (effect) {
        var _lightbox, _dialog, $anchor, $content, $children, $titlebar, options, chrome, contentStyle;

        _lightbox = $(lightbox).data('lightbox');
        _dialog = $viewer.data('dialog');

        $anchor = $(anchor);
        $content = $viewer;
        $children = $viewer.children();
        $titlebar = _dialog.uiDialogTitlebar;

        direction = {
          up: "down",
          down: "up",
          left: "right",
          right: "left"
        }[direction];
        options = _lightbox.options;

        contentStyle = _lightbox._contentStyle($content);

        chrome = {
          height: (parseInt($content.css('padding-top'), 10) || 0) + (parseInt($content.css('padding-bottom'), 10) || 0) + $titlebar.outerHeight(),
          width: (parseInt($content.css('padding-left'), 10) || 0) + (parseInt($content.css('padding-right'), 10) || 0)
        };

        $viewer.dialog('option', 'width', contentStyle.width + chrome.width);
        $viewer.dialog('option', 'height', contentStyle.height + chrome.height);

        $content.css(contentStyle);

        // todo: make the singleton tag an option.
        if ($children.length === 1 && $children[0].nodeName.match(/img/i)) {
          $children.css(contentStyle);
        }

        _dialog._position(options.position);

        return this
          .effect(options.rotateIn, {
            direction: direction,
            mode: 'show'
          },
          options.duration);

      };
    },

    _rotateClose: function ($viewer, direction) {
      var lightbox;
      lightbox = this.element;
      return function (effect) {
        var _lightbox, _dialog, options;

        _lightbox = $(lightbox).data('lightbox');
        _dialog = $viewer.data('dialog');

        options = _lightbox.options;

        return this.effect(options.rotateOut, {
            direction: direction,
            mode: 'hide'
          }, options.duration, function () {
            $viewer.remove();
          });

      };
    },

    _dialogOpen: function ($viewer) {
      var lightbox, anchor, chrome;
      lightbox = this.element;
      anchor = this.options.cursor;
      return function (effect) {
        var _lightbox, _dialog, $anchor, $content, $children, $titlebar, options, anchorStyle, contentStyle, lightboxStyle;

        _lightbox = $(lightbox).data('lightbox');
        _dialog = $viewer.data('dialog');

        $anchor = $(anchor);
        $content = $viewer;
        $children = $viewer.children();
        $titlebar = _dialog.uiDialogTitlebar;

        options = _lightbox.options;

        anchorStyle = _lightbox._anchorStyle($anchor);

        contentStyle = _lightbox._contentStyle($content);

        chrome = {
          height: (parseInt($content.css('padding-top'), 10) || 0) + (parseInt($content.css('padding-bottom'), 10) || 0) + $titlebar.outerHeight(),
          width: (parseInt($content.css('padding-left'), 10) || 0) + (parseInt($content.css('padding-right'), 10) || 0)
        };

        $viewer.dialog('option', 'width', contentStyle.width + chrome.width);
        $viewer.dialog('option', 'height', contentStyle.height + chrome.height);

        lightboxStyle = {
          height: 'show',
          width: 'show',
          opacity: 'show'
        };

        $content
          .css(anchorStyle)
          .animate(contentStyle, options.duration);

        // todo: make the singleton tag an option.
        if ($children.length === 1 && $children[0].nodeName.match(/img/i)) {
          $children.effect('size', {
            from: {
              width: anchorStyle.width,
              height: anchorStyle.height
            },
            to: {
              width: contentStyle.width,
              height: contentStyle.height
            },
            origin: [ contentStyle.top, contentStyle.left ],
            scale: 'both'
          }, options.duration);
        }

        _dialog._position(options.position);

        return this
          .animate(lightboxStyle, options.duration);
      };
    },

    _dialogClose: function ($viewer) {
      var lightbox, anchor;
      lightbox = this.element;
      anchor = this.options.cursor;
      return function (effect) {
        var _lightbox, _dialog, $content, $children, $anchor, options, anchorStyle;

        _lightbox = $(lightbox).data('lightbox');
        _dialog = $viewer.data('dialog');

        $anchor = $(anchor);
        $content = $viewer;
        $children = $viewer.children();

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
            origin: [ anchorStyle.top, anchorStyle.left ],
            scale: 'both'
          }, options.duration);
        }
        else {
          $content
            .hide(options.hide, {
              to: anchorStyle
            }, options.duration);
        }

        return this.animate(anchorStyle, options.duration, function () {
            if (_lightbox.overlay) {
              _lightbox.overlay.destroy();
            }
            $.ui.lightbox.overlay.resize();
            $viewer.remove();
          });

      };
    },

    _windowResizeStop: function ($viewer) {
      var lightbox, anchor;
      lightbox = this.element;
      anchor = this.options.cursor;
      return function (event, ui) {
        var _lightbox, _dialog, $anchor, $content, options, contentStyle, lightboxStyle;

        _lightbox = $(lightbox).data('lightbox');
        _dialog = $viewer.data('dialog');

        $anchor = $(anchor);
        $content = _dialog.element;

        options = _lightbox.options;

        contentStyle = _lightbox._contentStyle($content);

        options.width = contentStyle.width;
        options.height = contentStyle.height;

        lightboxStyle = _lightbox._lightboxStyle(_dialog);

        $content
          .css(contentStyle);

        _dialog.uiDialog
          .stop()
          .animate(lightboxStyle);

      };
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
        var $tmp;
        $tmp = $(this);
        offset = $tmp.offset();
        size.height = $tmp.outerHeight();
        size.width = $tmp.outerWidth();
      });
      style = $.extend({
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
        // This is the only place where I'm manpiulating the DOM in a style function.
        $content.css(options.constrain, length);
        size[options.constrain] = length;
      }
      if (size.width === 'auto' || size.height === 'auto') {
        size = this._actualContentSize($content);
        size = this._idealContentSize(size);
        $("*[width]", $content).attr({
          width: size.width,
          height: size.height
        });
      }

      // add the margins to the calculated dimensions of content.
      $.each(size, function (i, val) {
        if (parseInt(val, 10) > 0) {
          size[i] += (parseInt(margin[i], 10) || 0);
        }
      });

      style = $.extend({}, size);
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
    },
    linker: {
    }
  });

  /**
   * Link helpers
   */

  $.extend($.ui.lightbox.linker, {
    image: function ($anchor) {
      var lightbox;
      lightbox = this;
      $('<img/>').attr('src', $anchor[0].href).load(function (eventObject) {
        var width, height;
        $.swap(document.body.appendChild(this), {
          position: "absolute",
          visibility: "hidden",
          display: "block"
        }, function () {
          var $tmp;
          $tmp = $(this);
          width = $tmp.outerWidth();
          height = $tmp.outerHeight();
        });
        this.width = width;
        this.height = height;
        lightbox.display(this);
      });
    },
    media: function ($anchor) {
      var lightbox;
      lightbox = this;
      $anchor.clone().appendTo(document.body).media({
        width: this.options.width,
        height: this.options.height,
        src: $anchor[0].href,
        autoplay: 1
      },
      function (element, options) {},
      function (element, data, options, playerName) {
        lightbox.display(data);
      }).remove();
    },
    iframe: function ($anchor) {
      this.display($('<iframe/>').attr('src', $anchor[0].href).attr('frameborder', 0).attr('border', 0)[0]);
    },
    dom: function ($anchor) {
      var content;
      content = $($anchor.attr('href')).clone().show();
      this.display(content);
    },
    ajax: function ($anchor) {
      var lightbox;
      lightbox = this;
      $.ajax({
        // change to use ajaxOptions like in ui.tabs.
        url: $anchor[0].href,
        cache: true,
        async: true,
        dataType: "html",
        success: function (data, textStatus) {
          lightbox.display(data);
        }
      });
    },
    oembed: function ($anchor) {
      var lightbox, content;
      lightbox = this;
      content = $('<div/>').oembed($anchor.attr('href'), {}, function (container, oembed) {
        lightbox.display(oembed.code);
      });
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
}(jQuery));
