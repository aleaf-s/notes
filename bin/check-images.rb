# frozen_string_literal: true

require "cgi"
require "uri"
require "yaml"
require "pathname"

root = File.expand_path("..", __dir__)
destination = File.expand_path(ARGV[0] || "_site", root)
baseurl = (ARGV[1] || YAML.load_file(File.join(root, "_config.yml"))["baseurl"]).to_s.chomp("/")
abort "Build output not found: #{destination}" unless Dir.exist?(destination)
checked = 0
failures = []

Dir.glob(File.join(destination, "**", "*.html")).each do |file|
  html_path = Pathname.new(file).relative_path_from(Pathname.new(destination)).to_s.tr("\\", "/")
  File.read(file, encoding: "UTF-8").scan(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/i) do |capture|
    src = CGI.unescapeHTML(capture.first)
    next if src.match?(%r{\A(?:[a-z][a-z0-9+.-]*:|//)}i)

    checked += 1
    if src.empty? || src.include?("{{")
      failures << "#{html_path}: invalid image URL #{src.inspect}"
      next
    end
    path = src.split(/[?#]/, 2).first.to_s
    if path.start_with?("/")
      unless baseurl.empty? || path.start_with?("#{baseurl}/")
        failures << "#{html_path}: image URL misses baseurl: #{src}"
        next
      end
      path = path.delete_prefix(baseurl).delete_prefix("/")
    else
      path = File.join(File.dirname(html_path), path)
    end
    target = File.expand_path(URI::DEFAULT_PARSER.unescape(path).force_encoding("UTF-8"), destination)
    unless target.start_with?("#{destination}/") && File.file?(target)
      failures << "#{html_path}: missing image #{src}"
    end
  end
end

abort failures.join("\n") unless failures.empty?
puts "[ok] #{checked} generated local image references resolve to files"
