# NOTE: This converter requires Sequel and the MySQL gems.
# The MySQL gem can be difficult to install on OS X. Once you have MySQL
# installed, running the following commands should work:
# $ sudo gem install sequel
# $ sudo gem install mysql -- --with-mysql-config=/usr/local/mysql/bin/mysql_config
#
# If you are running MacPorts, it the mysql2 gem can be installed like this:
# $ gem install mysql2 -- --with-mysql-lib=/opt/local/lib/mysql56/mysql/ --with-mysql-include=/opt/local/include/mysql56/mysql

module JekyllImport
  module Importers
    class WordPress < Importer

      def self.require_deps
        JekyllImport.require_with_fallback(%w[
          rubygems
          sequel
          fileutils
          safe_yaml
          unidecode
        ])
      end

      def self.specify_options(c)
        c.option 'dbname', '--dbname DB', 'Database name (default: "")'
        c.option 'user', '--user USER', 'Database user name (default: "")'
        c.option 'password', '--password PW', "Database user's password (default: "")"
        c.option 'host', '--host HOST', 'Database host name (default: "localhost")'
        c.option 'table_prefix', '--prefix PREFIX', 'Table prefix name (default: "wp_")'
        c.option 'clean_entities', '--clean_entities', 'Whether to clean entities (default: true)'
        c.option 'comments', '--comments', 'Whether to import comments (default: true)'
        c.option 'categories', '--categories', 'Whether to import categories (default: true)'
        c.option 'tags', '--tags', 'Whether to import tags (default: true)'
        c.option 'more_excerpt', '--more_excerpt', 'Whether to use more excerpt (default: true)'
        c.option 'more_anchor', '--more_anchor', 'Whether to use more anchor (default: true)'
        c.option 'status', '--status STATUS,STATUS2', Array, 'Array of allowed statuses (default: ["publish"], other options: "draft", "private", "revision")'
      end

      # Main migrator function. Call this to perform the migration.
      #
      # dbname::  The name of the database
      # user::    The database user name
      # pass::    The database user's password
      # host::    The address of the MySQL database host. Default: 'localhost'
      # options:: A hash table of configuration options.
      #
      # Supported options are:
      #
      # :table_prefix::   Prefix of database tables used by WordPress.
      #                   Default: 'wp_'
      # :clean_entities:: If true, convert non-ASCII characters to HTML
      #                   entities in the posts, comments, titles, and
      #                   names. Requires the 'htmlentities' gem to
      #                   work. Default: true.
      # :comments::       If true, migrate post comments too. Comments
      #                   are saved in the post's YAML front matter.
      #                   Default: true.
      # :categories::     If true, save the post's categories in its
      #                   YAML front matter.
      # :tags::           If true, save the post's tags in its
      #                   YAML front matter.
      # :more_excerpt::   If true, when a post has no excerpt but
      #                   does have a <!-- more --> tag, use the
      #                   preceding post content as the excerpt.
      #                   Default: true.
      # :more_anchor::    If true, convert a <!-- more --> tag into
      #                   two HTML anchors with ids "more" and
      #                   "more-NNN" (where NNN is the post number).
      #                   Default: true.
      # :status::         Array of allowed post statuses. Only
      #                   posts with matching status will be migrated.
      #                   Known statuses are :publish, :draft, :private,
      #                   and :revision. If this is nil or an empty
      #                   array, all posts are migrated regardless of
      #                   status. Default: [:publish].
      #
      def self.process(opts)
        options = {
          :user           => opts.fetch('user', ''),
          :pass           => opts.fetch('password', ''),
          :host           => opts.fetch('host', 'localhost'),
          :dbname         => opts.fetch('dbname', ''),
          :table_prefix   => opts.fetch('prefix', 'wp_'),
          :clean_entities => opts.fetch('clean_entities', true),
          :comments       => opts.fetch('comments', true),
          :categories     => opts.fetch('categories', true),
          :tags           => opts.fetch('tags', true),
          :more_excerpt   => opts.fetch('more_excerpt', true),
          :more_anchor    => opts.fetch('more_anchor', true),
          :status         => opts.fetch('status', ["publish"]).map(&:to_sym) # :draft, :private, :revision
        }

        if options[:clean_entities]
          begin
            require 'htmlentities'
          rescue LoadError
            STDERR.puts "Could not require 'htmlentities', so the " +
                        ":clean_entities option is now disabled."
            options[:clean_entities] = false
          end
        end

        FileUtils.mkdir_p("_posts")

        db = Sequel.mysql2(options[:dbname], :user => options[:user], :password => options[:pass],
                          :host => options[:host], :encoding => 'utf8', :secure_auth => false)

        px = options[:table_prefix]

        posts_query = "
           SELECT
             posts.ID            AS `id`,
             posts.guid          AS `guid`,
             posts.post_type     AS `type`,
             posts.post_status   AS `status`,
             posts.post_title    AS `title`,
             posts.post_name     AS `slug`,
             posts.post_date     AS `date`,
             posts.post_date_gmt AS `date_gmt`,
             posts.post_content  AS `content`,
             posts.post_excerpt  AS `excerpt`,
             posts.comment_count AS `comment_count`,
             users.display_name  AS `author`,
             users.user_login    AS `author_login`,
             users.user_email    AS `author_email`,
             users.user_url      AS `author_url`
           FROM #{px}posts AS `posts`
             LEFT JOIN #{px}users AS `users`
               ON posts.post_author = users.ID"

        if options[:status] and not options[:status].empty?
          status = options[:status][0]
          posts_query << "
           WHERE posts.post_status = '#{status.to_s}'"
          options[:status][1..-1].each do |status|
            posts_query << " OR
             posts.post_status = '#{status.to_s}'"
          end
        end

        db[posts_query].each do |post|
          process_post(post, db, options)
        end
      end


      def self.process_post(post, db, options)
        px = options[:table_prefix]

        title = post[:title]
        if options[:clean_entities]
          title = clean_entities(title)
        end

        slug = post[:slug]
        if !slug or slug.empty?
          slug = sluggify(title)
        end

        date = post[:date] || Time.now
        name = "%02d-%02d-%02d-%s.markdown" % [date.year, date.month,
                                               date.day, slug]
        content = post[:content].to_s
        if options[:clean_entities]
          content = clean_entities(content)
        end

        excerpt = post[:excerpt].to_s

        more_index = content.index(/<!-- *more *-->/)
        more_anchor = nil
        if more_index
          if options[:more_excerpt] and
              (post[:excerpt].nil? or post[:excerpt].empty?)
            excerpt = content[0...more_index]
          end
          if options[:more_anchor]
            more_link = "more"
            content.sub!(/<!-- *more *-->/,
                         "<a id=\"more\"></a>" +
                         "<a id=\"more-#{post[:id]}\"></a>")
          end
        end

        categories = []
        tags = []

        if options[:categories] or options[:tags]

          cquery =
            "SELECT
               terms.name AS `name`,
               ttax.taxonomy AS `type`
             FROM
               #{px}terms AS `terms`,
               #{px}term_relationships AS `trels`,
               #{px}term_taxonomy AS `ttax`
             WHERE
               trels.object_id = '#{post[:id]}' AND
               trels.term_taxonomy_id = ttax.term_taxonomy_id AND
               terms.term_id = ttax.term_id"

          db[cquery].each do |term|
            if options[:categories] and term[:type] == "category"
              if options[:clean_entities]
                categories << clean_entities(term[:name])
              else
                categories << term[:name]
              end
            elsif options[:tags] and term[:type] == "post_tag"
              if options[:clean_entities]
                tags << clean_entities(term[:name])
              else
                tags << term[:name]
              end
            end
          end
        end

        comments = []

        if options[:comments] and post[:comment_count].to_i > 0
          cquery =
            "SELECT
               comment_ID           AS `id`,
               comment_author       AS `author`,
               comment_author_email AS `author_email`,
               comment_author_url   AS `author_url`,
               comment_date         AS `date`,
               comment_date_gmt     AS `date_gmt`,
               comment_content      AS `content`
             FROM #{px}comments
             WHERE
               comment_post_ID = '#{post[:id]}' AND
               comment_approved != 'spam'"


          db[cquery].each do |comment|

            comcontent = comment[:content].to_s
            if comcontent.respond_to?(:force_encoding)
              comcontent.force_encoding("UTF-8")
            end
            if options[:clean_entities]
              comcontent = clean_entities(comcontent)
            end
            comauthor = comment[:author].to_s
            if options[:clean_entities]
              comauthor = clean_entities(comauthor)
            end

            comments << {
              'id'           => comment[:id].to_i,
              'author'       => comauthor,
              'author_email' => comment[:author_email].to_s,
              'author_url'   => comment[:author_url].to_s,
              'date'         => comment[:date].to_s,
              'date_gmt'     => comment[:date_gmt].to_s,
              'content'      => comcontent,
            }
          end

          comments.sort!{ |a,b| a['id'] <=> b['id'] }
        end

        # Get the relevant fields as a hash, delete empty fields and
        # convert to YAML for the header.
        data = {
          'layout'        => post[:type].to_s,
          'status'        => post[:status].to_s,
          'published'     => (post[:status].to_s == "publish"),
          'title'         => title.to_s,
          'author'        => {
            'display_name'=> post[:author].to_s,
            'login'       => post[:author_login].to_s,
            'email'       => post[:author_email].to_s,
            'url'  => post[:author_url].to_s,
          },
          'author_login'  => post[:author_login].to_s,
          'author_email'  => post[:author_email].to_s,
          'author_url'    => post[:author_url].to_s,
          'excerpt'       => excerpt,
          'more_anchor'   => more_anchor,
          'wordpress_id'  => post[:id],
          'wordpress_url' => post[:guid].to_s,
          'date'          => date.to_s,
          'date_gmt'      => post[:date_gmt].to_s,
          'categories'    => options[:categories] ? categories : nil,
          'tags'          => options[:tags] ? tags : nil,
          'comments'      => options[:comments] ? comments : nil,
        }.delete_if { |k,v| v.nil? || v == '' }.to_yaml

        # Write out the data and content to file
        File.open("_posts/#{name}", "w") do |f|
          f.puts data
          f.puts "---"
          f.puts Util.wpautop(content)
        end
      end


      def self.clean_entities( text )
        if text.respond_to?(:force_encoding)
          text.force_encoding("UTF-8")
        end
        text = HTMLEntities.new.encode(text, :named)
        # We don't want to convert these, it would break all
        # HTML tags in the post and comments.
        text.gsub!("&amp;", "&")
        text.gsub!("&lt;", "<")
        text.gsub!("&gt;", ">")
        text.gsub!("&quot;", '"')
        text.gsub!("&apos;", "'")
        text.gsub!("/", "&#47;")
        text
      end


      def self.sluggify( title )
        title = title.to_ascii.downcase.gsub(/[^0-9A-Za-z]+/, " ").strip.gsub(" ", "-")
      end

    end
  end
end
