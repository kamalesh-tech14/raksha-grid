# Module Completion Checklist

Use this checklist before reporting any module as complete.

## Product

- [ ] User role identified
- [ ] User journey defined
- [ ] Success condition defined
- [ ] Emergency implications considered
- [ ] Real and simulated capabilities distinguished

## Mobile UI

- [ ] Mobile-first layout
- [ ] No horizontal overflow
- [ ] Safe-area support
- [ ] Large touch controls
- [ ] One-handed operation considered
- [ ] Loading state
- [ ] Empty state
- [ ] Error state
- [ ] Offline state
- [ ] Permission-denied state
- [ ] Stale-data state
- [ ] Simulation label where required
- [ ] Reduced-motion support

## Engineering

- [ ] Strict TypeScript
- [ ] Reusable components
- [ ] Runtime validation
- [ ] API errors handled
- [ ] Environment variables documented
- [ ] No secrets committed
- [ ] Offline persistence tested
- [ ] Duplicate actions prevented
- [ ] Logging avoids sensitive data

## SOS-specific

- [ ] SOS ID generated
- [ ] Idempotency key generated
- [ ] GPS source displayed
- [ ] Accuracy displayed
- [ ] Timestamp displayed
- [ ] Stored-local status distinguished from delivered
- [ ] Retry logic implemented
- [ ] Acknowledgement confirmed by backend
- [ ] Exact coordinates access-controlled
- [ ] All delivery attempts recorded

## Testing

- [ ] Unit tests
- [ ] Integration tests
- [ ] Mobile viewport tested
- [ ] Offline test
- [ ] Interrupted-network test
- [ ] Permission test
- [ ] Accessibility test
- [ ] Production build succeeds

## Demonstration

- [ ] Works without live external API
- [ ] Mock data labelled
- [ ] Hardware simulation labelled
- [ ] Demo reset control exists
- [ ] Guided sequence works from beginning to end
- [ ] Technical explanation is available
