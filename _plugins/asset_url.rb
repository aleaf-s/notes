# frozen_string_literal: true

require "uri"

module NotesAssetURL
  # Asset filenames are exact filesystem names. Addressable's normalization in
  # relative_url changes compatibility characters (e.g. full-width colons).
  def asset_url(input)
    baseurl = @context.registers[:site].config["baseurl"].to_s.chomp("/")
    path = input.to_s.sub(%r{\A/+}, "")
    # Paste Image already escapes spaces; preserve existing percent escapes.
    "#{baseurl}/#{path}".gsub(/%[0-9a-fA-F]{2}|[^A-Za-z0-9\-._~\/]/) do |part|
      part.match?(/\A%[0-9a-fA-F]{2}\z/) ? part : part.bytes.map { |byte| "%%%02X" % byte }.join
    end
  end
end

Liquid::Template.register_filter(NotesAssetURL)
