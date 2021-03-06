/*globals Drupal,$ */
"use strict";
Drupal.behaviors.lightbox = function (context) {
  var settings = Drupal.settings.uiLightbox;
  $.each(settings, function (index, options) {
    options.open = function () {
      Drupal.attachBehaviors(this);
    };
    $(index + ':not(.lightbox-processed)', context).lightbox(options);
  });
};
