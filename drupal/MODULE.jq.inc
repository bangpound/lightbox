<?php
function MODULE_jq($op, $plugin = NULL, $selector = NULL, $options = NULL) {
  switch ($op) {
    case 'info':
      return array(
        'lightbox' => array(
          'name' => t('jQuery UI Lightbox'),
          'description' => t('http://github.com/bangpound/lightbox'),
          'version' => '',
          'url' => 'http://bangpound.github.com/lightbox/',
        ),
        '_lightbox' => array(
          'files' => array(
            'js' => array(
              drupal_get_path('module', 'MODULE') . '/ui.lightbox.js',
              drupal_get_path('module', 'MODULE') . '/jq.lightbox.js',
            ),
            'css' => array(
              drupal_get_path('module', 'MODULE') . '/ui.lightbox.css',
            ),
          ),
        ),
      );
    case 'add':
      switch ($plugin) {
      case 'lightbox':
        $scripts = array(
          'ui.dialog',
          'ui.resizable',
          'ui.draggable',
          'effects.drop',
          'effects.scale',
        );
        jquery_ui_add($scripts);
        jq_add('_lightbox', $selector, $options);
        break;
      case '_lightbox':
        $setting = array(
          'uiLightbox' => array(
            $selector => $options
          )
        );
        drupal_add_js($setting, 'setting');
        break;
      }
    break;
  }
}
