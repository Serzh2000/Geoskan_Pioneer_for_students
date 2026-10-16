import argparse

_orig_add_parser = argparse._SubParsersAction.add_parser
_orig_init = argparse.ArgumentParser.__init__
_orig_add_subparsers = argparse.ArgumentParser.add_subparsers


def _patched_add_parser(self, name, **kwargs):
    kwargs.pop("color", None)
    return _orig_add_parser(self, name, **kwargs)


argparse._SubParsersAction.add_parser = _patched_add_parser


def _patched_init(self, *args, **kwargs):
    kwargs.pop("color", None)
    return _orig_init(self, *args, **kwargs)


argparse.ArgumentParser.__init__ = _patched_init


def _patched_add_subparsers(self, **kwargs):
    kwargs.setdefault("parser_class", argparse.ArgumentParser)
    return _orig_add_subparsers(self, **kwargs)


argparse.ArgumentParser.add_subparsers = _patched_add_subparsers
