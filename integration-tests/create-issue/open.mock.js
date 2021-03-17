module.exports = (url) => {
  const [resource, query] = url.split("?")
  console.log("MOCK opening", resource)
  const { title, body } = require("querystring").parse(query)
  console.log("MOCK title", title)
  console.log("MOCK body", body)
}
