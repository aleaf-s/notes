# frozen_string_literal: true

require "liquid"
require "uri"
require "ostruct"
require_relative "../_plugins/asset_url"

paths = [
  "/assets/第二章：物理层/截图.png",
  "/assets/a%20b/figure.png",
  "/assets/a b/figure#1.png"
]
["/notes", "/renamed-repo", ""].each do |baseurl|
  site = OpenStruct.new(config: { "baseurl" => baseurl })
  paths.each do |path|
    result = Liquid::Template.parse("{{ path | asset_url }}").render!(
      { "path" => path }, registers: { site: site }
    )
    expected = baseurl + URI::DEFAULT_PARSER.unescape(path)
    actual = URI::DEFAULT_PARSER.unescape(result).force_encoding("UTF-8")
    raise "Asset path changed: #{result}" unless actual == expected
    raise "Unsafe raw URL characters: #{result}" if result.match?(/[^\x21-\x7E]|#/)
  end
end
puts "Asset URL regression checks passed: Unicode punctuation, spaces, URL escapes, baseurl."
