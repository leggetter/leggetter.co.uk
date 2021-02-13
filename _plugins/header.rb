class Jekyll::MarkdownHeader < Jekyll::Converters::Markdown
    def convert(content)
        result = super.gsub(/<h(\d)>(.*?)<\/h(\d)>/){
            |h| "<h#{$1} id=\"#{self.parameterise($2)}\"><a href=\"##{self.parameterise($2)}\">#{$2}</a></h#{$1}>"
        }
        # result = super.gsub(/<h(\d)>(.*?)<\/h(\d)>/, '<h\1 id="\2"><a href="#\2">\2</a></h\1>')
        return result
    end

    def parameterise(str)
        str = str.downcase
        str = str.gsub(/\s+/, '-')
        return str
    end
end