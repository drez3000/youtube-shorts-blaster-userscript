// ==UserScript==
// @name         YouTube Shorts Blaster
// @description  A userscript to automatically detect and remove YouTube page elements containing shorts outside of the "/shorts" page itself.
// @namespace    drez3000
// @author       drez3000
// @copyright    2024, drez3000 (https://github.com/drez3000)
// @license      MIT
// @match        *://*.youtube.com/*
// @exclude      *://accounts.youtube.com/*
// @grant        none
// @version      0.1.1
// @updateURL    https://raw.githubusercontent.com/drez3000/youtube-shorts-blaster-userscript/main/src/userscript.user.js
// @downloadURL  https://raw.githubusercontent.com/drez3000/youtube-shorts-blaster-userscript/main/src/userscript.user.js
// ==/UserScript==

; (() => {
	'use strict'

	const MAX_TRIGGERS = 2
	const ATTEMPTS = 32
	const MAX_CHECK_DELAY_MS = 400

	function oncePageLoaded(callback) {
		if (document.readyState !== 'loading') {
			// Document is already ready, call the callback immediately
			callback()
		} else {
			// Document is not ready yet, wait for the DOMContentLoaded event
			document.addEventListener('DOMContentLoaded', callback)
		}
	}

	function flatNodesOf(node, { minDepth = 0, maxDepth = Number.POSITIVE_INFINITY, includeShadowRoot = true } = {}) {
		const nodes = []
		const stack = [{ node, depth: 0 }]
		while (stack.length > 0) {
			const { node: currentNode, depth } = stack.pop()

			if (depth >= minDepth && depth <= maxDepth) {
				nodes.push({ node: currentNode, depth })
			}

			// Add children to the stack with increased depth
			for (let i = currentNode.childNodes.length - 1; i >= 0; i--) {
				stack.push({ node: currentNode.childNodes[i], depth: depth + 1 })
			}
			if (includeShadowRoot && currentNode.shadowRoot) {
				stack.push({ node: currentNode.shadowRoot, depth: depth + 1 })
			}
		}
		return nodes.sort((a, b) => a.depth - b.depth).map((item) => item.node)
	}

	function isMain(node) {
		const tagName = node?.tagName || ''
		return tagName.match(/^(html|main|body|content|article)$/i)
	}

	function isShortsElement(node) {
		const tagName = node?.tagName || ''
		const headers = [...node.querySelectorAll(`h1,h2,h3,h4,h5,h6`)]
		return (
			tagName.match(/reel/i)
			|| (node?.attributes && node.attributes['is-shorts'] != undefined)
			|| (headers.length === 1 && headers.at(0).innerText.match(/^shorts$/i))
		)
	}

	function removeYoutubeShorts() {
		return flatNodesOf(document)
			.filter((node) => (
				typeof node?.querySelectorAll === 'function'
				&& node?.attributes != undefined
				&& !isMain(node)
				&& isShortsElement(node)
			))
			.map((node) => {
				node.remove && node.remove()
				return node
			})
	}

	function enqueue(a = 0, triggered = 0) {
		if (
			document.location.href.match(/youtube\..*\/shorts/i)
			|| document.location.href.match(/youtube\..*\/history/i)
			|| document.location.href.match(/youtube\..*\/playlist/i)
			|| document.location.href.match(/youtube\..*\/account/i)
		) {
			return
		}
		const ms = Math.max(0, Math.min(10 ** (a - 1), MAX_CHECK_DELAY_MS))
		setTimeout(() => {
			const matches = removeYoutubeShorts()
			if (matches.length) {
				console.info(`[YOUTUBE SHORTS BLASTER] Removed ${matches.length} elements:`, matches)
			}
			triggered += matches.length
			if (triggered < MAX_TRIGGERS && a < ATTEMPTS) {
				enqueue(a + 1, triggered)
			}
		}, ms)
	}

	function main() {
		let loc = document?.location?.href
		setInterval(() => {
			const _loc = document?.location?.href
			if (_loc != loc) {
				loc = _loc
				enqueue()
			}
		}, 100)
		oncePageLoaded(enqueue)
	}

	main()
})()
