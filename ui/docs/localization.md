# NERA Localization

NERA supports English and the Northeast language options exposed in the header:

- Assamese (`as`)
- Bengali (`bn`)
- Bodo (`brx`)
- Khasi (`kha`)
- Garo (`grt`)
- Meitei (`mni`)
- Mizo (`lus`)
- Ao Naga (`njo`)
- Nepali (`ne`)
- Kokborok (`trp`)
- Nyishi (`inc`)

The language selector is intentionally session-only. Each page reload starts in English. Translation records fall back to English per label when a language does not yet have a reviewed translation for that key.

The selected language is sent to search, geocoding, routing, hazard, and system-status requests. The routing engine normalizes regional values such as `as-IN` to `as`, falls back to English for unsupported values, and returns the normalized language in `Content-Language` and route responses.

External place names and free-form hazard reasons remain source data and are not rewritten by the UI translation layer.