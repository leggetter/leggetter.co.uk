require "jekyll-import";
require_relative "./wordpress.rb";

JekyllImport::Importers::WordPress.run({
  "dbname"   => ENV["WP_DB_NAME"],
  "user"     => ENV["WP_DB_USER"],
  "password" => ENV["WP_DB_PWD"],
  "host"     => ENV["WP_DB_HOST"],
  "prefix"   => "wp_",
  "clean_entities" => true,
  "comments"       => true,
  "categories"     => true,
  "tags"           => true,
  "more_excerpt"   => true,
  "more_anchor"    => true,
  "status"         => ["publish"]
})
