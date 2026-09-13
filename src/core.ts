/**
 * Framework-agnostic entry point.
 *
 * This module must never carry a 'use client' directive and must never import
 * React: it is importable from server code and is the basis for future
 * vanilla / Vue / Svelte adapters. scripts/check-directives.mjs enforces the
 * first half of that, eslint.config.js the second.
 */
export * from './core/index';
