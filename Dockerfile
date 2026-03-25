ARG RUNNER_IMAGE
FROM ${RUNNER_IMAGE}

ENV TESTS_DIR=/tmp/clone

USER root
RUN mkdir -p "$TESTS_DIR" && \
    chown -R runner:runner "$TESTS_DIR"
COPY --chown=runner:runner . "$TESTS_DIR"
USER runner
