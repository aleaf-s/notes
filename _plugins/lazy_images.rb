# frozen_string_literal: true

# Add native lazy loading to generated content images. Explicit loading or
# decoding attributes are preserved, so an important image can opt into eager
# loading in its Markdown/HTML source.
Jekyll::Hooks.register %i[pages documents], :post_render do |document|
  next unless document.output_ext == ".html"

  document.output = document.output.gsub(/<img\b([^>]*)>/i) do
    attributes = Regexp.last_match(1)
    closing = attributes.sub!(/\s*\/\s*\z/, "") ? " /" : ""
    loading = attributes.match?(/\sloading\s*=/i) ? "" : ' loading="lazy"'
    decoding = attributes.match?(/\sdecoding\s*=/i) ? "" : ' decoding="async"'
    "<img#{attributes}#{loading}#{decoding}#{closing}>"
  end
end
